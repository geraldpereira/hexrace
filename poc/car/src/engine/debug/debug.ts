import Stats from 'stats.js';
import GUI from 'lil-gui';

/** Wraps the dev overlays (FPS panel + tweak GUI) attached to the page. */
export class Debug {
    readonly stats: Stats;
    readonly gui: GUI;

    constructor() {
        this.stats = new Stats();
        this.stats.showPanel(0);
        this.stats.dom.style.position = 'fixed';
        this.stats.dom.style.top = '0';
        this.stats.dom.style.left = '0';
        document.body.appendChild(this.stats.dom);

        this.gui = new GUI({title: 'Debug', closeFolders: true, width: 270});
    }
}
