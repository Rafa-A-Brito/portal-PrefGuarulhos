import { Link } from "react-router-dom";
import "./NaoEncontrada.css";

export default function NaoEncontrada() {
  return (
    <section className="pagina-nao-encontrada">
      <span className="pagina-nao-encontrada-codigo" aria-hidden="true">404</span>
      <h1>Página não encontrada</h1>
      <p>O endereço pode estar incorreto ou a página não está mais disponível.</p>
      <div className="pagina-nao-encontrada-acoes">
        <Link className="btn-solid" to="/">Voltar ao início</Link>
        <Link className="btn-outline" to="/patrimonios">Ver patrimônios</Link>
      </div>
    </section>
  );
}
