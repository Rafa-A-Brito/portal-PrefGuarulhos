import { useRef, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { alterarSenha, extrairMensagemDeErro } from "../../../services/adminApi";
import { lerSessao } from "../../../services/api";
import ForcaSenha from "../components/ForcaSenha";
import { avaliarForcaSenha } from "../../../utils/forcaSenha.js";

export default function AdminSenha() {
  const { logout } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const pendente = useRef(false);

  async function salvar(event) {
    event.preventDefault();
    if (pendente.current) return;
    if (!avaliarForcaSenha(novaSenha).atendeLimites) {
      setErro("A nova senha deve ter pelo menos 12 caracteres e no máximo 72 bytes UTF-8.");
      return;
    }
    if (novaSenha !== confirmacao) { setErro("A confirmação deve ser igual à nova senha."); return; }
    const sessao = lerSessao();
    pendente.current = true;
    setSalvando(true);
    setErro("");
    try {
      await alterarSenha({ senhaAtual, novaSenha });
      // Uma resposta atrasada desta conta não encerra uma sessão iniciada depois.
      const atual = lerSessao();
      if (!sessao?.sessionId || sessao.sessionId !== atual?.sessionId) return;
      // O guard existente faz um único redirecionamento e conserva a confirmação.
      await logout(atual.token, "senhaAlterada");
    } catch (error) {
      if (error.response?.status !== 401) setErro(extrairMensagemDeErro(error));
    } finally { pendente.current = false; setSalvando(false); }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header"><div><h1>Alterar senha</h1>
        <p>Após salvar, entre novamente em todos os dispositivos.</p></div></header>
      <form className="admin-form" onSubmit={salvar}>
        <div className="admin-form-grid">
          <label>Senha atual<input type="password" autoComplete="current-password" required
            value={senhaAtual} onChange={event => setSenhaAtual(event.target.value)} disabled={salvando} /></label>
          <div>
            <label>Nova senha<input type="password" autoComplete="new-password" required minLength={12}
              aria-describedby="forca-senha-alteracao"
              value={novaSenha} onChange={event => setNovaSenha(event.target.value)} disabled={salvando} /></label>
            <ForcaSenha senha={novaSenha} id="forca-senha-alteracao" />
          </div>
          <label>Confirmar nova senha<input type="password" autoComplete="new-password" required minLength={12}
            value={confirmacao} onChange={event => setConfirmacao(event.target.value)} disabled={salvando} /></label>
        </div>
        {erro && <p className="admin-form-erro" role="alert">{erro}</p>}
        <div className="admin-form-acoes"><button className="btn-solid" type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Alterar senha"}</button></div>
      </form>
    </div>
  );
}
