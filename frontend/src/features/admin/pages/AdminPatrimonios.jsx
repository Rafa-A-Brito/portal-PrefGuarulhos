import { useEffect, useState } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { CATEGORIA_META, CATEGORIAS_ORDEM } from "../../../features/categoriaMeta";
import { listarPatrimonios } from "../../../services/fakeApi";
import * as adminApi from "../../../services/adminApi";

const FORMULARIO_VAZIO = {
  nome: "",
  categoria: CATEGORIAS_ORDEM[0],
  bairro: "",
  endereco: "",
  cep: "",
  resumo: "",
  imagemPrincipal: "",
  lat: "",
  lng: "",
};

// Transforma o patrimônio que veio da API (com localizacao.lat/lng) no
// formato "plano" que o formulário usa (lat e lng soltos), e vice-versa.
function paraFormulario(patrimonio) {
  return {
    nome: patrimonio.nome,
    categoria: patrimonio.categoria,
    bairro: patrimonio.bairro,
    endereco: patrimonio.endereco || "",
    cep: patrimonio.cep || "",
    resumo: patrimonio.resumo,
    imagemPrincipal: patrimonio.imagemPrincipal || "",
    lat: patrimonio.localizacao?.lat ?? "",
    lng: patrimonio.localizacao?.lng ?? "",
  };
}

export default function AdminPatrimonios() {
  const [patrimonios, setPatrimonios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [erroFormulario, setErroFormulario] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function carregarPatrimonios() {
    setCarregando(true);
    setErro(null);

    try {
      const lista = await listarPatrimonios();
      setPatrimonios(lista);
    } catch (err) {
      setErro(adminApi.extrairMensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarPatrimonios();
  }, []);

  function abrirNovo() {
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
    setEditandoId("novo");
  }

  function abrirEdicao(patrimonio) {
    setFormulario(paraFormulario(patrimonio));
    setErroFormulario(null);
    setEditandoId(patrimonio.id);
  }

  function fecharFormulario() {
    setEditandoId(null);
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErroFormulario(null);

    try {
      if (editandoId === "novo") {
        await adminApi.criarPatrimonio(formulario);
      } else {
        await adminApi.atualizarPatrimonio(editandoId, formulario);
      }

      fecharFormulario();
      await carregarPatrimonios();
    } catch (err) {
      setErroFormulario(adminApi.extrairMensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(patrimonio) {
    const confirmou = window.confirm(
      `Excluir "${patrimonio.nome}"? Essa ação não pode ser desfeita.`,
    );
    if (!confirmou) return;

    try {
      await adminApi.excluirPatrimonio(patrimonio.id);
      await carregarPatrimonios();
    } catch (err) {
      window.alert(adminApi.extrairMensagemDeErro(err));
    }
  }

  return (
    <div>
      <div className="admin-page-head admin-page-head-row">
        <div>
          <h1>Patrimônios</h1>
          <p>O acervo que aparece no site público vem direto daqui.</p>
        </div>

        <button type="button" className="btn-solid" onClick={abrirNovo}>
          <PlusIcon width={16} height={16} />
          Novo patrimônio
        </button>
      </div>

      {editandoId && (
        <form className="admin-form" onSubmit={salvar}>
          <h2>{editandoId === "novo" ? "Novo patrimônio" : "Editar patrimônio"}</h2>

          <div className="admin-form-grid">
            <label className="admin-form-col-2">
              Nome
              <input
                required
                value={formulario.nome}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, nome: e.target.value }))
                }
              />
            </label>

            <label>
              Categoria
              <select
                value={formulario.categoria}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, categoria: e.target.value }))
                }
              >
                {CATEGORIAS_ORDEM.map((slug) => (
                  <option key={slug} value={slug}>
                    {CATEGORIA_META[slug].label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Bairro
              <input
                required
                value={formulario.bairro}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, bairro: e.target.value }))
                }
              />
            </label>

            <label>
              Endereço
              <input
                value={formulario.endereco}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, endereco: e.target.value }))
                }
              />
            </label>

            <label>
              CEP
              <input
                value={formulario.cep}
                placeholder="00000-000"
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, cep: e.target.value }))
                }
              />
            </label>

            <label>
              Latitude
              <input
                type="number"
                step="any"
                value={formulario.lat}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, lat: e.target.value }))
                }
              />
            </label>

            <label>
              Longitude
              <input
                type="number"
                step="any"
                value={formulario.lng}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, lng: e.target.value }))
                }
              />
            </label>

            <label className="admin-form-col-2">
              URL da imagem principal
              <input
                type="url"
                placeholder="https://... ou /uploads/arquivo.jpg"
                value={formulario.imagemPrincipal}
                onChange={(e) =>
                  setFormulario((f) => ({
                    ...f,
                    imagemPrincipal: e.target.value,
                  }))
                }
              />
            </label>

            <label className="admin-form-col-2">
              Resumo
              <textarea
                required
                rows={3}
                value={formulario.resumo}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, resumo: e.target.value }))
                }
              />
            </label>
          </div>

          {erroFormulario && <p className="admin-form-erro">{erroFormulario}</p>}

          <div className="admin-form-acoes">
            <button type="submit" className="btn-solid" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" className="btn-outline" onClick={fecharFormulario}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="empty-state">Carregando patrimônios...</p>
      ) : erro ? (
        <p className="empty-state">{erro}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Bairro</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {patrimonios.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{CATEGORIA_META[p.categoria]?.label ?? p.categoria}</td>
                <td>{p.bairro}</td>
                <td className="admin-table-acoes">
                  <button
                    type="button"
                    aria-label={`Editar ${p.nome}`}
                    onClick={() => abrirEdicao(p)}
                  >
                    <PencilIcon width={16} height={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir ${p.nome}`}
                    onClick={() => excluir(p)}
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
