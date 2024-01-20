import { expect, test, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import packPlugin, { Options } from '../src'
import { PluginOption } from 'vite'

beforeAll(async ()=>{
	if(fs.existsSync('tests/dist')) 
		fs.rmSync("tests/dist", { force: true, recursive: true })
  if(fs.existsSync('tests/outDist')) 
		fs.rmSync("tests/outDist", { force: true, recursive: true })	
	await CreateDumpFiles()
})

afterAll(()=>{
//	if(fs.existsSync('tests/dist')) 
//		fs.rmSync("tests/dist", { force: true, recursive: true })	
  if(fs.existsSync('tests/outDist')) 
		fs.rmSync("tests/outDist", { force: true, recursive: true })	
})

afterEach(()=>{
	if(fs.existsSync('tests/dist/out.zip'))
		fs.rmSync('tests/dist/out.zip')
})

async function CreateDumpFiles(){ 
	await fs.promises.mkdir('tests/dist')
	await fs.promises.writeFile('tests/dist/a.js', 'a')
	await fs.promises.writeFile('tests/dist/b.ts', 'b')
	await fs.promises.writeFile('tests/dist/package.json', '{"p": "p"}')
	await fs.promises.mkdir('tests/dist/assets/')
	await fs.promises.writeFile('tests/dist/assets/c.txt', 'c')
}

test('meta check', async () => {
	const inst: any = packPlugin()

	expect(inst).not.toBeNull()
	expect(inst.name).toBe('vite-plugin-zip-pack')
	expect(inst.apply).toBe('build')
	expect(inst.enforce).toBe('post')
	expect(inst.closeBundle).instanceOf(Function)
})

const options =()=> ({inDir: 'tests/dist', outDir: 'tests/dist', outFileName: "out.zip", done: () => {}} as Options)

test('build zip', async () => {
	const inst: any = packPlugin(options())
	await inst.closeBundle() 
	expect(fs.existsSync('tests/dist/out.zip')).toBeTruthy()
})

test('generated zip output', async () => {
	const inst: any = packPlugin(options())
	await inst.closeBundle() 
	const zipStats = fs.statSync('tests/dist/out.zip')
	expect(zipStats.size).greaterThan(11)

	const content = await fs.promises.readFile('tests/dist/out.zip')
	const JSZip = (await import('jszip')).default
	const archive = await JSZip().loadAsync(content)
	expect(!!archive.files['a.js']).toBeTruthy()
	expect(!!archive.files['b.ts']).toBeTruthy()
	expect(!!archive.files['package.json']).toBeTruthy()
	expect(!!archive.files['assets/c.txt']).toBeTruthy()
})

test('call done callback', async () => {
	let isCalled = false
	function done(){ isCalled = true }
	const op = options()
	op.done = done
	const inst: any = packPlugin(op)
	await inst.closeBundle() 
	await fs.promises.access('tests/dist/out.zip')
	expect(fs.existsSync('tests/dist/out.zip')).toBeTruthy()
	expect(isCalled).toBeTruthy()
})

test('call done callback with error', async () => {
	let hadError = false
	const op = options()
	op.inDir = 'undefined'
	op.done = (ex: Error | undefined) => { hadError = Boolean(ex) }
	const inst: any = packPlugin(op)
	await inst.closeBundle()
	expect(!fs.existsSync('tests/dist/out.zip')).toBeTruthy()
	expect(hadError).toBeTruthy()
})

test('other filename', async () => {
	const op = options()
	op.outFileName = 'outy.zip'
	const inst: any = packPlugin(op)
	await inst.closeBundle()
	expect(fs.existsSync('tests/dist/outy.zip')).toBeTruthy()
})

test('other output path', async () => {
	const op = options()
	op.outDir = 'tests/outDist'
	const inst: any = packPlugin(op)
	await inst.closeBundle()
	expect(fs.existsSync('tests/outDist/out.zip')).toBeTruthy()
})

/*
test('path prefix', async () => {
	const op = options()
	op.outDir = 'tests/outDist'
	const inst: any = packPlugin(op)
	await inst.closeBundle()
	expect(fs.existsSync('tests/outDist/out.zip')).toBeTruthy()
})*/
