/**
 * L'instantané des entrées à un pas, dans la forme d'une manette : chaque source (clavier,
 * manette, tactile) normalise son matériel dans cette disposition, et le jeu lit la fusion.
 * Convention : stick Y positif vers le bas, comme l'API Gamepad ; gâchettes de 0 à 1.
 */
export class GameInput {
  leftStickX = 0;
  leftStickY = 0;
  rightStickX = 0;
  rightStickY = 0;
  leftTrigger = 0;
  rightTrigger = 0;
  leftBumper = 0;
  rightBumper = 0;
  buttonA = 0;
  buttonY = 0;
  pauseRequested = false;

  reset(): void {
    this.leftStickX = 0;
    this.leftStickY = 0;
    this.rightStickX = 0;
    this.rightStickY = 0;
    this.leftTrigger = 0;
    this.rightTrigger = 0;
    this.leftBumper = 0;
    this.rightBumper = 0;
    this.buttonA = 0;
    this.buttonY = 0;
    this.pauseRequested = false;
  }
}
