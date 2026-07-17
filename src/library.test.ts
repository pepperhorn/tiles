import { fetchLibraryList, fetchLibraryDoc } from './library';
import { defaultDoc } from './designer/sheetModel';

const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ data }) }) as Response;
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) }) as Response;

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => fetchMock.mockReset());

describe('fetchLibraryList', () => {
  test('requests published items with the metadata field list and maps rows', async () => {
    fetchMock.mockResolvedValue(ok([
      { id: 'a1', title: 'Song A', subtitle: 'Sub', key_root: 'G', key_quality: 'major', bpm: 100 },
      { id: 'b2', title: 'Song B', subtitle: null, key_root: null, key_quality: null, bpm: null },
      { id: 'c3', title: null, subtitle: null, key_root: null, key_quality: null, bpm: null },
    ]));
    const list = await fetchLibraryList();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/items/tiles?');
    expect(url).toContain('filter[status][_eq]=published');
    expect(url).toContain('fields=id,title,subtitle,key_root,key_quality,bpm');
    expect(url).toContain('sort=title');
    expect(url).toContain('limit=-1');
    expect(list).toEqual([
      { id: 'a1', title: 'Song A', subtitle: 'Sub', keyRoot: 'G', keyQuality: 'major', bpm: 100 },
      { id: 'b2', title: 'Song B', subtitle: null, keyRoot: null, keyQuality: null, bpm: null },
      { id: 'c3', title: 'Untitled', subtitle: null, keyRoot: null, keyQuality: null, bpm: null },
    ]);
  });

  test('a missing or blank title falls back to Untitled', async () => {
    fetchMock.mockResolvedValue(ok([
      { id: 'd4', subtitle: null, key_root: null, key_quality: null, bpm: null },
      { id: 'e5', title: '', subtitle: null, key_root: null, key_quality: null, bpm: null },
    ]));
    const list = await fetchLibraryList();
    expect(list.map(e => e.title)).toEqual(['Untitled', 'Untitled']);
  });

  test('an unrecognised key_quality coerces to null', async () => {
    fetchMock.mockResolvedValue(ok([
      { id: 'f6', title: 'Song F', subtitle: null, key_root: 'D', key_quality: 'dorian', bpm: null },
    ]));
    const list = await fetchLibraryList();
    expect(list[0].keyQuality).toBeNull();
  });

  test('throws on a non-OK response', async () => {
    fetchMock.mockResolvedValue(fail(403));
    await expect(fetchLibraryList()).rejects.toThrow(/403/);
  });

  test('throws on a malformed response body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ nope: true }) } as Response);
    await expect(fetchLibraryList()).rejects.toThrow(/malformed/i);
  });
});

describe('fetchLibraryDoc', () => {
  test('fetches sheetdoc_json by id and validates it like a JSON import', async () => {
    fetchMock.mockResolvedValue(ok({
      sheetdoc_json: { ...defaultDoc(), title: 'Tafelmusik', bpm: 999, items: [{ type: 'note', noteId: 'G' }] },
    }));
    const doc = await fetchLibraryDoc('a1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/items/tiles/a1?fields=sheetdoc_json');
    expect(doc.title).toBe('Tafelmusik');
    expect(doc.bpm).toBe(300); // clamped by parseSheetValue
    expect(doc.items).toHaveLength(1);
  });

  test('rejects a sheetdoc_json without an items array', async () => {
    fetchMock.mockResolvedValue(ok({ sheetdoc_json: { title: 'broken' } }));
    await expect(fetchLibraryDoc('a1')).rejects.toThrow(/items array/);
  });

  test('throws on a non-OK response', async () => {
    fetchMock.mockResolvedValue(fail(404));
    await expect(fetchLibraryDoc('missing')).rejects.toThrow(/404/);
  });
});
