// shadcn/ui Card (MIT), adaptado para JSX e CSS Modules, sem reset global.
// https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/card.tsx
import styles from "./ui.module.css";

export function Card({ className = "", ...props }) {
  return <section data-slot="card" className={`${styles.card} ${className}`} {...props} />;
}
export function CardHeader(props) {
  return <header data-slot="card-header" className={styles.header} {...props} />;
}
export function CardTitle(props) {
  return <h2 data-slot="card-title" className={styles.title} {...props} />;
}
export function CardDescription(props) {
  return <p data-slot="card-description" className={styles.description} {...props} />;
}
export function CardContent(props) {
  return <div data-slot="card-content" className={styles.content} {...props} />;
}
