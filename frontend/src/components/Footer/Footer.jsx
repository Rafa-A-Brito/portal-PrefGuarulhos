import { Link } from "react-router-dom";
import {
  MapPinIcon,
  PhoneIcon,
  //BuildingLibraryIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

export default function Footer() {
  return (
    <footer className="app-footer" id="contato">
      <div className="footer-grid">
        <div className="footer-col footer-brand">
          <div className="footer-brand-row">
            <img
              src="/logo_guarulhos_2.png"
              alt="Prefeitura de Guarulhos"
              className="footer-logo"
            />

            <div>
              <strong>Patrimônio Cultural</strong>
              <span>Guarulhos, que faz e que cuida!</span>
            </div>
          </div>

          <p>
            Plataforma dedicada à consulta e valorização dos bens históricos,
            culturais e naturais do município de Guarulhos.
          </p>
        </div>

        <div className="footer-col">
          <h4>Navegação</h4>

          <Link to="/">Início</Link>
          <Link to="/mapa">Mapas</Link>
          <Link to="/patrimonios">Patrimônios</Link>
          <Link to="/conheca-mais">Conheça mais</Link>
          <Link to="/contato">Contato</Link>
        </div>

        <div className="footer-col">
          <h4>Prefeitura de Guarulhos</h4>

          <span className="footer-info">
            <MapPinIcon width={15} height={15} />
            Av. Bom Clima, 91 — Bom Clima
          </span>

          <span className="footer-info">
            <PhoneIcon width={15} height={15} />
            (11) 2475-8600
          </span>

          <a
            href="https://www.guarulhos.sp.gov.br/"
            target="_blank"
            rel="noreferrer"
            className="footer-external-link"
          >
            <ArrowTopRightOnSquareIcon width={15} height={15} />
            Portal oficial da Prefeitura
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} Patrimônio Cultural de Guarulhos. Projeto
          acadêmico.
        </p>
      </div>
    </footer>
  );
}
