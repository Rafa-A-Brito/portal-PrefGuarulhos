import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

/**
 * Este componente é um guard de experiência do usuário para o React
 * Router, não um guard de segurança. Ele funciona como uma rota "pai": as
 * rotas filhas dela (usando Outlet) só chegam a renderizar se a pessoa
 * estiver autenticada, e opcionalmente, se tiver um dos perfis permitidos.
 *
 * Vale repetir o aviso que já existe no AuthContext: isso só evita que o
 * React desenhe uma tela que a pessoa não deveria ver. Quem garante de
 * verdade que ninguém sem permissão consegue criar, editar ou apagar nada
 * são os middlewares authenticate e authorize do
 * backend (backend/src/middlewares/).
 *
 * A prop permissoes é opcional. Se ela não for passada, o único requisito
 * é estar logado. Se for passada (por exemplo, ["ADMIN"]), o perfil do
 * usuário logado precisa estar nessa lista.
 */
export default function RotaProtegida({ permissoes }) {
  const { autenticado, carregando, usuario } = useAuth();
  const location = useLocation();

  if (carregando) {
    return <div className="empty-state">Verificando sessão...</div>;
  }

  if (!autenticado) {
    // O "state: { from }" guarda pra onde a pessoa ia, pra devolver ela
    // pra lá depois que fizer login com sucesso.
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (permissoes && !permissoes.includes(usuario?.perfil)) {
    // Importante: aqui a gente mostra uma mensagem em vez de redirecionar
    // pra outra rota protegida. Se redirecionasse pra "/admin", por
    // exemplo, e "/admin" também exigisse esse mesmo perfil, a pessoa
    // ficaria presa num loop de redirecionamentos.
    return (
      <div className="empty-state">
        <p>Sua conta ({usuario?.perfil}) não tem permissão para acessar essa área.</p>
        <Link to="/" className="btn-outline">
          Voltar para o site
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
