/** How much UI surrounds the sheet. Per-control overrides go in `controls`. */
export type ChromePreset = 'full' | 'minimal' | 'none';

/** Per-control overrides of the chrome preset. */
export type CrfTilesControls = Partial<Record<'tempo' | 'tileSize' | 'transport', boolean>>;

export type ResolvedChrome = {
  /** Play/Stop. */
  transport: boolean;
  /** Loop, Metronome and Count-in next to Play/Stop (full chrome only). */
  transportExtras: boolean;
  tempo: boolean;
  tileSize: boolean;
  /** Whether a toolbar shows at all. */
  bar: boolean;
};

/**
 * `full`: Play/Stop with Loop/Metronome/Count-in, tempo slider and tile-size buttons. `minimal`: Play/Stop only.
 * `none`: the sheet alone. `controls` switches single controls on or off over the preset. `static` mode has no
 * transport or tempo (nothing plays), whatever `controls` says.
 */
export function resolveChrome(preset: ChromePreset = 'full', controls: CrfTilesControls = {}, playable = true): ResolvedChrome {
  const transport = playable && (controls.transport ?? preset !== 'none');
  const tempo = playable && (controls.tempo ?? preset === 'full');
  const tileSize = controls.tileSize ?? preset === 'full';
  return { transport, transportExtras: transport && preset === 'full', tempo, tileSize, bar: transport || tempo || tileSize };
}
