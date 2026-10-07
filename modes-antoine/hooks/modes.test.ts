import { expect, test } from 'claude-code/testing'

import { buildSection, parseProbe } from './register'

const OUT = [
  '@@ENV',
  'machine : Mac local (fichiers du Mac accessibles)',
  'présents : python3 py:docx',
  'absents : Rscript',
  '@@CARNETS',
  '- /Users/a/Downloads/COLODETECT2/CARNET.md : COLODETECT 2',
  '@@ANNUAIRE',
  '# Annuaire',
  '- Denat | « Denard »',
].join('\n')

test('lit les trois blocs de la sonde', () => {
  const p = parseProbe(OUT)
  expect(p.env).toContain('absents : Rscript')
  expect(p.carnets).toBe('- /Users/a/Downloads/COLODETECT2/CARNET.md : COLODETECT 2')
  expect(p.annuaire).toContain('Denat')
})

test('blocs vides tolérés', () => {
  const p = parseProbe('@@ENV\nmachine : cloud\n@@CARNETS\n@@ANNUAIRE\n')
  expect(p.carnets).toBe('')
  expect(buildSection(p)).toContain('## Carnets de projet existants\naucun')
})

test('la section contient les quatre modes et l\'état', () => {
  const s = buildSection(parseProbe(OUT))
  for (const t of ['Cadrage express', 'Faisabilité d\'abord', 'Livrable Debourdeau', 'Carnet de projet', 'COLODETECT2/CARNET.md', 'Denard']) {
    expect(s).toContain(t)
  }
})

test('sans sonde, les règles seules', () => {
  expect(buildSection(undefined)).toContain('Cadrage express')
})

test('la section est ajoutée au prompt système', async ($, on) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: OUT, stderr: '' } }) as never)
  on('prompt.compose', () => ({ sections: [{ id: 'core', text: 'base', scope: 'shared' as const }] }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true } as never)
  const { sections } = await $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] })
  const mine = sections.find(s => s.id === 'modes-antoine:modes')
  expect(mine?.scope).toBe('session')
  expect(mine?.text).toContain('Denard')
})
