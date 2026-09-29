import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar/NavBar";
import Footer from "./components/Footer/Footer";

import Inicio from "./pages/Inicio/Inicio";
import Mapa from "./pages/Mapa/Mapa";
import Patrimonios from "./pages/Patrimonios/Patrimonios";
import ConhecaMais from "./pages/ConhecaMais/ConhecaMais";
import PatrimonioDetalhe from "./pages/PatrimonioDetalhe/PatrimonioDetalhe";

import { PatrimoniosProvider } from "./context/PatrimoniosContext";
import { AuthProvider } from "./context/AuthContext";

import RotaProtegida from "./features/admin/components/RotaProtegida";
import LoginAdmin from "./features/admin/pages/LoginAdmin";
import Contato from "./pages/Contato/Contato";

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
                  <Route path="/contato" element={<Contato />} />
                </Routes>
              </div>
            </main>

            <Footer />
          </div>
        }
      />

      {/* ===== Área administrativa ===== */}

      <Route path="/admin/login" element={<LoginAdmin />} />

      <Route element={<RotaProtegida />}>
        <Route
          path="/admin"
          element={
            <div className="page-hero">
              <h1>Dashboard administrativo</h1>
              <p>Em construção.</p>
            </div>
          }
        />

        {/* Próximas rotas:
        
        <Route
          path="/admin/patrimonios"
          element={<PatrimoniosAdmin />}
        />

        <Route
          path="/admin/usuarios"
          element={<UsuariosAdmin />}
        />

        */}
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
