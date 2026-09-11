import { petitAnneau, trackErrors, turnKind } from './model';

// Placeholder tant qu'il n'y a pas de vue : on affiche la piste du croquis en texte.
const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
    const errors = trackErrors(petitAnneau);
    const lines = petitAnneau.tiles.map(
        (tile, i) =>
            `${String(i).padStart(2)}  sortie ${String(tile.exit).padStart(2)}  ${turnKind(tile.exit).padEnd(8)}` +
            `  pos ${tile.profile.position}  piste ${tile.profile.roadWidth}  h ${tile.profile.height}`,
    );
    app.innerHTML = `<h1>${petitAnneau.name}</h1><pre>${lines.join('\n')}</pre><p>${
        errors.length === 0 ? 'Piste valide.' : errors.join('<br>')
    }</p>`;
}
