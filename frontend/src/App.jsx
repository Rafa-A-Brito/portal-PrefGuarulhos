import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar/NavBar";
import Footer from "./components/Footer/Footer";

import Inicio from "./pages/Inicio/Inicio";
import Mapa from "./pages/Mapa/Mapa";
import Patrimonios from "./pages/Patrimonios/Patrimonios";
import ConhecaMais from "./pages/ConhecaMais/ConhecaMais";
import PatrimonioDetalhe from "./pages/PatrimonioDetalhe/PatrimonioDetalhe";
import Contato from "./pages/Contato/Contato";

import { PatrimoniosProvider } from "./context/PatrimoniosContext";
import { AuthProvider } from "./context/AuthContext";

import RotaProtegida from "./features/admin/components/RotaProtegida";
import AdminLayout from "./features/admin/components/AdminLayout";
import LoginAdmin from "./features/admin/pages/LoginAdmin";
import AdminDashboard from "./features/admin/pages/AdminDashboard";
import AdminUsuarios from "./features/admin/pages/AdminUsuarios";
import AdminPatrimonios from "./features/admin/pages/AdminPatrimonios";
import ConhecaMaisDetalhes from "./pages/ConheceMaisDetalhes/ConhecaMaisDetalhes";

function AdminLoading() {
  const [etapa, setEtapa] = useState("carregando");

  useEffect(() => {
    const verificando = setTimeout(() => {
      setEtapa("verificado");
    }, 1200);

    const concluindo = setTimeout(() => {
      setEtapa("concluido");
    }, 2200);

    return () => {
      clearTimeout(verificando);
      clearTimeout(concluindo);
    };
  }, []);

  return (
    <div className="admin-loading">
      <div className="admin-loading-content">
        {etapa === "carregando" && (
          <>
            <div className="admin-loading-spinner" />

            <p>Carregando a página</p>
          </>
        )}

        {etapa === "verificado" && (
          <>
            <div className="admin-loading-check">✓</div>

            <p>Acesso verificado</p>
          </>
        )}

        {etapa === "concluido" && (
          <>
            <div className="admin-loading-check">✓</div>

            <p>Admin - logado</p>
          </>
        )}
      </div>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();

  const [carregandoAdmin, setCarregandoAdmin] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/admin") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCarregandoAdmin(true);

      const timer = setTimeout(() => {
        setCarregandoAdmin(false);
      }, 2800);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  if (carregandoAdmin) {
    return <AdminLoading />;
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
    <AuthProvider>
      <PatrimoniosProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </PatrimoniosProvider>
    </AuthProvider>
  );
}
