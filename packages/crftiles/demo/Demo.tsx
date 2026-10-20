// The demo page body: the embed with a real sheet (Amazing Grace, from crf-admin sheets.tiles_doc) in several chrome
// presets and container widths.
import { useState } from 'react';
import fixture from '../fixtures/amazing-grace.tiles.json';
import { CrfTiles, version, type SheetDoc } from '../src/index';

const sheet = fixture as unknown as SheetDoc;

export function Demo() {
  const [log, setLog] = useState<string[]>([]);
  const note = (msg: string) => setLog(l => [...l.slice(-4), msg]);
  return (
    <main className="demo-page">
      <h1 className="demo-title">crftiles {version}</h1>
      <section className="demo-card">
        <h2>chrome="full" (default), mode="player"</h2>
        <CrfTiles doc={sheet} onReady={({ doc }) => note(`ready: ${doc.title}`)} onError={e => note(`error: ${e.message}`)} />
      </section>
      <div className="demo-row">
        <section className="demo-card">
          <h2>chrome="minimal", height="360px", tileSize="xl"</h2>
          <CrfTiles doc={JSON.stringify(sheet)} chrome="minimal" height="360px" tileSize="xl" />
        </section>
        <section className="demo-card">
          <h2>mode="static", chrome="none"</h2>
          <CrfTiles doc={sheet} mode="static" chrome="none" />
        </section>
      </div>
      <section className="demo-card demo-narrow">
        <h2>320px container, audio=false</h2>
        <CrfTiles doc={sheet} audio={false} />
      </section>
      <section className="demo-card">
        <h2>invalid doc → onError</h2>
        <CrfTiles doc={'{"title":"broken"}'} onError={e => note(`error: ${e.message}`)} />
      </section>
      <pre className="demo-log">{log.join('\n')}</pre>
    </main>
  );
}

