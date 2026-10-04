import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

import Navbar from "./components/Navbar/NavBar";
import Footer from "./components/Footer/Footer";
import ErrorBoundary from "./components/ErroModal/ErroBoundary";

import Inicio from "./pages/Inicio/Inicio";
import Mapa from "./pages/Mapa/Mapa";
import Patrimonios from "./pages/Patrimonios/Patrimonios";
import ConhecaMais from "./pages/ConhecaMais/ConhecaMais";
import PatrimonioDetalhe from "./pages/PatrimonioDetalhe/PatrimonioDetalhe";
import Contato from "./pages/Contato/Contato";

import { PatrimoniosProvider } from "./context/PatrimoniosContext";
import { AuthProvider } from "./context/AuthContext";
import { ErroModalProvider } from "./context/ErroModalContext";
import { useAuth } from "./hooks/useAuth";

import RotaProtegida from "./features/admin/components/RotaProtegida";
import AdminLayout from "./features/admin/components/AdminLayout";
import LoginAdmin from "./features/admin/pages/LoginAdmin";
import AdminDashboard from "./features/admin/pages/AdminDashboard";
import AdminUsuarios from "./features/admin/pages/AdminUsuarios";
import AdminPatrimonios from "./features/admin/pages/AdminPatrimonios";
import ConhecaMaisDetalhes from "./pages/ConheceMaisDetalhes/ConhecaMaisDetalhes";

// Tempo mínimo de cada etapa da transição, só para a tela não "piscar" quando
// a verificação termina rápido demais. O spinner NÃO depende de tempo fixo:
// ele gira até a verificação de verdade (AuthContext) terminar.
const TEMPO_MINIMO_CARREGANDO_MS = 900;
const TEMPO_VERIFICADO_MS = 1100;

/**
 * Tela de transição ao abrir o painel (/admin).
 *
 * - "pronto" vem da verificação real da sessão (AuthContext.carregando).
 *   Enquanto ela não termina, o ícone de carregamento continua girando.
 * - Quando a verificação termina (e o tempo mínimo passou), o ícone vira um
 *   "check" verde, a tela mostra o nome da pessoa e depois chama onConcluir.
 */
function AdminLoading({ pronto, nome, onConcluir }) {
  const [minimoPassou, setMinimoPassou] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setMinimoPassou(true),
      TEMPO_MINIMO_CARREGANDO_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  const verificado = pronto && minimoPassou;

  useEffect(() => {
    if (!verificado) return undefined;

    const timer = setTimeout(onConcluir, TEMPO_VERIFICADO_MS);
    return () => clearTimeout(timer);
  }, [verificado, onConcluir]);

  const primeiroNome = nome?.split(" ")[0];

  return (
    <div className="admin-transicao" role="status" aria-live="polite">
      <div className="admin-transicao-card">
        <img
          className="admin-transicao-logo"
          src="/logo_guarulhos.png"
          alt="Prefeitura de Guarulhos"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />

        <span className={`admin-transicao-icone${verificado ? " is-ok" : ""}`}>
          {verificado ? (
            <CheckCircleIcon width={36} height={36} />
          ) : (
            <ArrowPathIcon width={34} height={34} className="icon-spin" />
          )}
        </span>

        <h2>{verificado ? "Acesso verificado" : "Verificando seu acesso"}</h2>

        <p>
          {verificado
            ? `Olá${primeiroNome ? `, ${primeiroNome}` : ""}. Abrindo o painel…`
            : "Confirmando sua sessão no painel administrativo."}
        </p>

        <div className={`admin-transicao-barra${verificado ? " is-ok" : ""}`}>
          <span />
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const { carregando: verificandoSessao, autenticado, usuario } = useAuth();

  // A transição aparece uma vez a cada vez que se navega para /admin. Em vez
  // de ligar/desligar com um efeito (que deixaria o painel "piscar" por um
  // quadro antes da transição), guardamos a chave da navegação que já foi
  // concluída: location.key muda a cada navegação.
  const [chaveConcluida, setChaveConcluida] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const concluirTransicao = useCallback(
    () => setChaveConcluida(location.key),
    [location.key],
  );

  const emTransicao =
    location.pathname === "/admin" && chaveConcluida !== location.key;

  // Sem sessão (e já verificado), não há o que "validar": deixa a
  // RotaProtegida mandar a pessoa para o login em vez de mostrar a transição.
  if (emTransicao && (verificandoSessao || autenticado)) {
    return (
      <AdminLoading
        pronto={!verificandoSessao && autenticado}
        nome={usuario?.nome}
        onConcluir={concluirTransicao}
      />
    );
  }

  return (
    <Routes location={location}>
      {/* ===== Site público ===== */}

      <Route
        path="/*"
        element={
          <div className="app-container">
            <Navbar />

            <main className="app-main">
              <div key={location.pathname} className="page-transition">
                <Routes location={location}>
                  <Route path="/" element={<Inicio />} />

                  <Route path="/mapa" element={<Mapa />} />

                  <Route path="/patrimonios" element={<Patrimonios />} />

                  <Route
                    path="/patrimonios/:id"
                    element={<PatrimonioDetalhe />}
                  />

                  <Route path="/conheca-mais" element={<ConhecaMais />} />
                  <Route
                    path="/conheca-mais/detalhes"
                    element={<ConhecaMaisDetalhes />}
                  />
                  <Route path="/contato" element={<Contato />} />
                </Routes>
              </div>
            </main>

            <Footer />
          </div>
        }
      />

      {/* ===== Área administrativa =====
         Por enquanto só existe o perfil "admin" com acesso a este painel
         (o perfil "tecnico" já existe no banco, pensando num RBAC maior
         mais pra frente, mas ainda não tem nenhuma tela liberada pra ele).
         Todas as rotas dentro do RotaProtegida com permissoes={["admin"]}
         só renderizam se a pessoa logada tiver esse perfil. */}

      <Route path="/admin/login" element={<LoginAdmin />} />

      <Route element={<RotaProtegida permissoes={["admin"]} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/usuarios" element={<AdminUsuarios />} />
          <Route path="/admin/patrimonios" element={<AdminPatrimonios />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ErroModalProvider>
      <ErrorBoundary>
        <AuthProvider>
          <PatrimoniosProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </PatrimoniosProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ErroModalProvider>
  );
}
