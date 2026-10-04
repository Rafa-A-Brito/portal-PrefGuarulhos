import { useEffect, useMemo, useState, useCallback } from "react";
import {
  listarPatrimonios,
  obterEstatisticas,
  listarCategoriasComContagem,
} from "../services/fakeApi";
import { PatrimoniosContext } from "./patrimoniosContextInstance";

export function PatrimoniosProvider({ children }) {
  const [patrimonios, setPatrimonios] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [categorias, setCategorias] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Item selecionado — usado pela página de Mapa e pela lista de Patrimônios
  // pra destacar o mesmo item em componentes diferentes.
  const [selecionado, setSelecionado] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [listaResp, statsResp, catResp] = await Promise.all([
        listarPatrimonios(),
        obterEstatisticas(),
        listarCategoriasComContagem(),
      ]);
      setPatrimonios(listaResp);
      setEstatisticas(statsResp);
      setCategorias(catResp);
    } catch (erroCapturado) {
      console.error(
        "[PatrimoniosProvider] falha ao carregar dados:",
        erroCapturado,
      );
      setErro("Não foi possível carregar os dados do patrimônio agora.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const value = useMemo(
    () => ({
      patrimonios,
      estatisticas,
      categorias,
      carregando,
      erro,
      recarregar: carregar,
      selecionado,
      setSelecionado,
    }),
    [
      patrimonios,
      estatisticas,
      categorias,
      carregando,
      erro,
      carregar,
      selecionado,
    ],
  );

  return (
    <PatrimoniosContext.Provider value={value}>
      {children}
    </PatrimoniosContext.Provider>
  );
}
