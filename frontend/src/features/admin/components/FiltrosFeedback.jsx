import { useId } from "react";
import { TIPOS } from "../feedbackDashboard";
import styles from "../pages/AdminFeedback.module.css";

export default function FiltrosFeedback({ form, setForm, erro, inputRef, aplicar, limpar, atualizar, nome = "Filtros de feedback" }) {
  const id = useId(), ajuda = `${id}-ajuda`, erroId = `${id}-erro`;
  return <form className={`admin-form ${styles.filtros}`} aria-label={nome} onSubmit={aplicar} noValidate>
    <div className={styles.grade}>
      {[["inicio", "Data inicial"], ["fim", "Data final"]].map(([chave, rotulo]) => <label key={chave}>{rotulo}
        <input ref={chave === "inicio" ? inputRef : undefined} value={form[chave]} onChange={e => setForm(f => ({ ...f, [chave]: e.target.value }))}
          type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} required
          aria-describedby={`${ajuda}${erro ? ` ${erroId}` : ""}`} aria-invalid={Boolean(erro)} />
      </label>)}
      <label>Tipo de feedback<select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
        <option value="">Todos os tipos</option>{Object.entries(TIPOS).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></label>
      <label>Granularidade<select value={form.granularidade} onChange={e => setForm(f => ({ ...f, granularidade: e.target.value }))}>
        <option value="dia">Diária</option><option value="mes">Mensal</option></select></label>
    </div>
    <p id={ajuda} className={styles.nota}>Use dd/mm/aaaa. Datas inclusivas, até 366 dias, sem futuro. Padrão: últimos 30 dias civis, incluindo hoje.</p>
    {erro && <p id={erroId} role="alert">{erro}</p>}
    <div className={styles.acoes}><button type="submit" className="btn-solid">Aplicar filtros</button>
      <button type="button" className="btn-outline" onClick={limpar}>Limpar filtros</button>
      <button type="button" className="btn-outline" onClick={atualizar}>Atualizar dados</button></div>
  </form>;
}
