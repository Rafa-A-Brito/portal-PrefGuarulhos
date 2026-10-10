import { useEffect, useRef, useState } from "react";
import { consultarCep, normalizarCep } from "../services/cepApi";

const CAMPOS = ["endereco", "bairro", "cidade", "uf"];

function invalidarConsulta(consulta) {
  consulta.pedido++;
  clearTimeout(consulta.timer);
  consulta.controller?.abort();
  consulta.controller = null;
}

// A consulta nasce exclusivamente do evento de edição do CEP, nunca da
// hidratação do formulário. As origens acompanham inclusive edições em voo.
export function useCepEndereco(setFormulario) {
  const [feedbackCep, setFeedbackCep] = useState("");
  const consultaRef = useRef({ pedido: 0, cep: "", origens: {}, timer: null, controller: null });

  useEffect(() => {
    const consulta = consultaRef.current;
    return () => invalidarConsulta(consulta);
  }, []);

  function cancelarConsultaCep() {
    invalidarConsulta(consultaRef.current);
    setFeedbackCep("");
  }

  function reiniciarCep(formulario = {}) {
    cancelarConsultaCep();
    const consulta = consultaRef.current;
    consulta.cep = normalizarCep(formulario.cep);
    consulta.origens = Object.fromEntries(
      CAMPOS.map(campo => [campo, formulario[campo]?.trim() ? "manual" : "vazio"]),
    );
  }

  function marcarCampoManual(campo) {
    if (CAMPOS.includes(campo)) consultaRef.current.origens[campo] = "manual";
  }

  function alterarCep(valor) {
    const consulta = consultaRef.current;
    const cep = normalizarCep(valor);
    if (cep === consulta.cep) return;
    cancelarConsultaCep();
    consulta.cep = cep;
    if (cep.length !== 8) return;

    const pedido = consulta.pedido;
    consulta.timer = setTimeout(async () => {
      const controller = new AbortController();
      consulta.controller = controller;
      setFeedbackCep("Consultando CEP...");
      try {
        const resultado = await consultarCep(cep, { signal: controller.signal });
        if (pedido !== consulta.pedido || controller.signal.aborted) return;
        const preenchimento = {};
        for (const campo of CAMPOS) {
          if (consulta.origens[campo] !== "manual") {
            preenchimento[campo] = resultado[campo];
            consulta.origens[campo] = "cep";
          }
        }
        setFormulario(atual => pedido === consulta.pedido
          ? { ...atual, ...preenchimento }
          : atual);
        setFeedbackCep("");
      } catch (erro) {
        if (pedido !== consulta.pedido || controller.signal.aborted) return;
        setFeedbackCep(erro.message);
      } finally {
        if (pedido === consulta.pedido) consulta.controller = null;
      }
    }, 450);
  }

  return { feedbackCep, alterarCep, marcarCampoManual, reiniciarCep, cancelarConsultaCep };
}
