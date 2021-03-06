import {pack} from '../../src/value'
import JsContext from '../../src/js-context/JsContext'

import test from 'tape'

test('JsContext', t => {
  let c = new JsContext()

  t.ok(c instanceof JsContext)
  t.equal(c.constructor.name, 'JsContext')

  t.end()
})

test('JsContext.call with no inputs, no errors and no output', t => {
  let c = new JsContext()
  t.plan(2)

  c.call('let x = 3\n\n').then(result => {
    t.deepEqual(result, {errors: null, output: null}, 'assign')
  })

  c.call('// Multiple lines and comments\nlet x = {\na:1\n\n}\n\n').then(result => {
    t.deepEqual(result, {errors: null, output: null}, 'assign')
  })
})

test('JsContext.call with no inputs, no errors', t => {
  let c = new JsContext()
  t.plan(3)

  c.call('return 42').then(result => {
    t.deepEqual(result, {errors: null, output: pack(42)}, 'just an evaluation')
  })
  c.call('let x = 3\nreturn x*3').then(result => {
    t.deepEqual(result, {errors: null, output: pack(9)}, 'assign and return')
  })
  c.call('let x = 3\nx*3\n').then(result => {
    t.deepEqual(result, {errors: null, output: null}, 'no return so no output')
  })
})

test('JsContext.call with inputs and outputs but no errors', t => {
  let c = new JsContext()
  t.plan(2)

  c.call('return a*6', {a: pack(7)}).then(result => {
    t.deepEqual(result, {errors: null, output: pack(42)})
  })
  c.call('return a*b[1]', {a: pack(17), b: pack([1, 2, 3])}).then(result => {
    t.deepEqual(result, {errors: null, output: pack(34)})
  })
})

test('JsContext.call output multiline', t => {
  let c = new JsContext()
  t.plan(1)

  c.call(`return {
    jermaine: 'Hiphopopotamus',
    brett: 'Rhymnoceros'
  }`, null, {pack: false}).then(result => {
    t.deepEqual(result, {errors: null, output: { brett: 'Rhymnoceros', jermaine: 'Hiphopopotamus' }})
  })
})

test('JsContext.call with errors', t => {
  let c = new JsContext()
  t.plan(3)

  c.call('foo').then(result => {
    t.deepEqual(result, {errors: { 1: 'ReferenceError: foo is not defined' }, output: null})
  })
  c.call('1\n2\nfoo\n4').then(result => {
    t.deepEqual(result, {errors: { 3: 'ReferenceError: foo is not defined' }, output: null})
  })
  c.call('<>').then(result => {
    t.deepEqual(result, {errors: { 0: 'SyntaxError: Unexpected token <' }, output: null})
  })
})

test('JsContext.run', t => {
  let c = new JsContext()
  t.plan(6)

  c.run('foo = "bar"')
  t.equal(foo, 'bar', 'can set global variable') // eslint-disable-line no-undef

  c.run('foo').then(result => {
    t.deepEqual(result, {errors: null, output: pack('bar')}, 'can get global variable')
  })
  c.run('foo + "t_simpson"').then(result => {
    t.deepEqual(result, {errors: null, output: pack('bart_simpson')}, 'can get global variable expression')
  })
  c.run('foo\n42\n"lisa"').then(result => {
    t.deepEqual(result, {errors: null, output: pack('lisa')}, 'last value is returned')
  })
  c.run('\n').then(result => {
    t.deepEqual(result, {errors: null, output: null}, 'nothing returned when empty')
  })
  c.run('let x = 5').then(result => {
    t.deepEqual(result, {errors: null, output: null}, 'nothing returned when last line is statement')
  })
})

test('JsContext.run with errors', t => {
  let c = new JsContext()
  t.plan(3)

  c.run('foogazi').then(result => {
    t.deepEqual(result, {errors: { 1: 'ReferenceError: foogazi is not defined' }, output: null})
  })
  c.run('2*45\nfoogazi').then(result => {
    t.deepEqual(result, {errors: { 2: 'ReferenceError: foogazi is not defined' }, output: null})
  })
  c.run('<>').then(result => {
    t.deepEqual(result, {errors: { 0: 'SyntaxError: Unexpected token <' }, output: null})
  })
})

test('JsContext.depends', t => {
  let c = new JsContext()
  t.plan(3)

  c.depends('foo').then(result => t.deepEqual(result, ['foo']))
  c.depends('let foo\n foo').then(result => t.deepEqual(result, []))
  c.depends('let foo').then(result => t.deepEqual(result, []))
})

test('JsContext.hasFunction', t => {
  let c = new JsContext()

  t.ok(c.hasFunction('type'))
  t.notOk(c.hasFunction('this_is_not_a_registered_function'))
  t.end()
})

test('JsContext.callFunction without function name', t => {
  let c = new JsContext()
  t.plan(1)

  t.throws(() => {
    c.callFunction()
  })
})

test('JsContext.callFunction with no inputs', t => {
  let c = new JsContext()
  t.plan(1)

  c.callFunction('type').then(result => {
    t.deepEqual(result, {output: pack('unk'), errors: null})
  })
})

test('JsContext.callFunction with inputs and output', t => {
  let c = new JsContext()
  t.plan(1)

  c.callFunction('type', [pack(1)]).then(result => {
    t.deepEqual(result, {output: pack('int'), errors: null})
  })
})

test('JsContext.callFunction with error', t => {
  let c = new JsContext()
  t.plan(1)
  c._functions['foo'] = () => {
    throw new Error('nope')
  }
  c.callFunction('foo').then(result => {
    t.deepEqual(result, {errors: { 0: 'Error: nope' }, output: null})
  })
})
