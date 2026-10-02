(function () {
  'use strict';
  const api = typeof module !== 'undefined' && module.exports ? require('./app.js') : window.Sueldo;
  const { Calendar, Money, Salary, Selection, MonthRepository } = api;
  const cases = [];
  const test = (name, run) => cases.push({ name, run });
  const equal = (actual, expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
    }
  };
  const throws = (run) => {
    let caught = false;
    try { run(); } catch (_) { caught = true; }
    if (!caught) throw new Error('Expected validation failure');
  };
  const state = (overrides = {}) => ({ month: '2026-09', base: 400000, advance: 0, name: '', selectedDays: [], ...overrides });
  const memory = () => {
    const values = new Map();
    return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  };

  [['2026-02', 20], ['2026-05', 21], ['2026-09', 22], ['2026-07', 23]].forEach(([month, count]) => {
    test(`AC02: ${month} has ${count} weekdays`, () => equal(Calendar.getMonth(month).weekdayCount, count));
  });
  test('AC02: leap years and century exceptions', () => {
    equal(Calendar.getMonth('2024-02').days.length, 29);
    equal(Calendar.getMonth('2000-02').days.length, 29);
    equal(Calendar.getMonth('1900-02').days.length, 28);
  });
  test('AC02: September 2026 starts Tuesday, with 30 days', () => {
    const month = Calendar.getMonth('2026-09');
    equal(month.offset, 1); equal(month.days.length, 30);
    equal(month.days[4].kind, 'saturday'); equal(month.days[5].kind, 'sunday');
  });
  test('AC01: malformed month identifiers rejected', () => {
    ['2026-00', '2026-13', '2026-2', '0099-01', '10000-01', 'bad'].forEach((value) => throws(() => Calendar.getMonth(value)));
  });
  test('AC06: navigation crosses year boundaries and respects limits', () => {
    equal(Calendar.shift('2026-12', 1), '2027-01');
    equal(Calendar.shift('2026-01', -1), '2025-12');
    throws(() => Calendar.shift('1900-01', -1)); throws(() => Calendar.shift('9999-12', 1));
  });
  test('AC01: accepts integer pesos only', () => {
    equal(Money.parse('400000'), 400000); equal(Money.parse(' 0 '), 0);
    ['', '1.5', '-1', '+1', '1e5', 'NaN', 'Infinity', '400,000', '1000000000001'].forEach((value) => throws(() => Money.parse(value)));
  });
  test('AC04: CLP formatting uses Chilean pesos and no decimal places', () => {
    equal(Money.format(400000), '$400.000'); equal(Money.format(-25000), '$-25.000');
  });
  test('AC04: daily rate rounded to nearest peso for 20-23 weekdays', () => {
    equal(Salary.calculate(state({ month: '2026-02' })).dailyRate, 20000);
    equal(Salary.calculate(state({ month: '2026-05' })).dailyRate, 19048);
    equal(Salary.calculate(state()).dailyRate, 18182);
    equal(Salary.calculate(state({ month: '2026-07' })).dailyRate, 17391);
    equal(Salary.calculate(state({ base: 11 })).dailyRate, 1);
  });
  test('AC04: normal day, Saturday and Sunday use independent rates', () => {
    const result = Salary.calculate(state({ selectedDays: [1, 5, 6], advance: 10000 }));
    equal([result.weekdayPay, result.saturdayPay, result.sundayPay, result.total, result.balance], [18182, 20000, 25000, 63182, 53182]);
    equal([result.weekdays, result.saturdays, result.sundays], [1, 1, 1]);
  });
  test('AC04: weekends still pay extras with zero base', () => equal(Salary.calculate(state({ base: 0, selectedDays: [5, 6] })).total, 45000));
  test('AC05: empty, fully paid and excess advance balances', () => {
    equal(Salary.calculate(state()).balance, 0);
    equal(Salary.calculate(state({ selectedDays: [5], advance: 20000 })).balance, 0);
    equal(Salary.calculate(state({ selectedDays: [5], advance: 25000 })).balance, -5000);
  });
  test('AC04: full month reports rounding adjustment explicitly', () => {
    const selectedDays = Calendar.getMonth('2026-09').days.filter((day) => day.kind === 'weekday').map((day) => day.day);
    const result = Salary.calculate(state({ selectedDays }));
    equal(result.total, 400004); equal(result.roundingAdjustment, 4);
  });
  test('AC03: toggle is immutable, sorted and reversible', () => {
    const original = [1, 5];
    equal(Selection.toggle(original, 6), [1, 5, 6]);
    equal(Selection.toggle(original, 1), [5]); equal(original, [1, 5]);
    equal(Selection.toggle(Selection.toggle([], 30), 30), []);
  });
  test('AC01: invalid, duplicate and out-of-month selections rejected', () => {
    [[0], [31], [1.5], [1, 1], ['1']].forEach((selectedDays) => throws(() => Salary.calculate(state({ selectedDays }))));
    [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER].forEach((base) => throws(() => Salary.calculate(state({ base }))));
  });
  test('AC04: large allowed amounts remain safe integers', () => {
    const selectedDays = Calendar.getMonth('2026-09').days.map((day) => day.day);
    const result = Salary.calculate(state({ base: Money.MAX, advance: Money.MAX, selectedDays }));
    ['dailyRate', 'weekdayPay', 'total', 'balance'].forEach((field) => equal(Number.isSafeInteger(result[field]), true));
  });
  test('AC06: save and load are isolated by month', () => {
    const repository = new MonthRepository(memory());
    const september = state({ selectedDays: [1, 5], advance: 20000, name: 'Ana' });
    const october = state({ month: '2026-10', base: 500000 });
    repository.save(september); repository.save(october);
    equal(repository.load(september.month), september); equal(repository.load(october.month), october);
    repository.remove(september.month); equal(repository.load(september.month), null);
    equal(repository.load(october.month), october);
  });
  test('AC07: malformed storage is preserved and rejected', () => {
    const storage = memory(); const repository = new MonthRepository(storage);
    const key = MonthRepository.key('2026-09');
    ['{broken', JSON.stringify({ version: 2, ...state() }), JSON.stringify({ version: 1, ...state({ selectedDays: [99] }) }), JSON.stringify({ version: 1, ...state({ month: '2026-10' }) })].forEach((raw) => {
      storage.setItem(key, raw); throws(() => repository.load('2026-09')); equal(storage.getItem(key), raw);
    });
  });
  test('AC07: storage failures propagate to controller', () => {
    const repository = new MonthRepository({ getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Full'); }, removeItem() { throw new Error('Denied'); } });
    throws(() => repository.load('2026-09')); throws(() => repository.save(state())); throws(() => repository.remove('2026-09'));
  });
  test('AC04: all 2026 months obey subtotal and balance invariants', () => {
    for (let month = 1; month <= 12; month += 1) {
      const key = `2026-${String(month).padStart(2, '0')}`;
      const selectedDays = Calendar.getMonth(key).days.map((day) => day.day);
      const result = Salary.calculate(state({ month: key, selectedDays, advance: 12345 }));
      equal(result.total, result.weekdayPay + result.saturdayPay + result.sundayPay);
      equal(result.balance, result.total - 12345);
      equal(result.weekdays + result.saturdays + result.sundays, selectedDays.length);
    }
  });

  const results = cases.map(({ name, run }) => {
    try { run(); return { name, passed: true }; }
    catch (error) { return { name, passed: false, error: error.message }; }
  });
  if (typeof document !== 'undefined') {
    const list = document.getElementById('test-results');
    results.forEach((result) => {
      const item = document.createElement('li');
      item.className = result.passed ? 'test-pass' : 'test-fail';
      item.textContent = `${result.passed ? 'OK' : 'ERROR'}: ${result.name}${result.error ? `: ${result.error}` : ''}`;
      list.append(item);
    });
    document.getElementById('test-summary').textContent = `${results.filter((result) => result.passed).length}/${results.length} pruebas correctas`;
    window.testResults = results;
  } else {
    results.forEach((result) => console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? `: ${result.error}` : ''}`));
    console.log(`${results.filter((result) => result.passed).length}/${results.length} passed`);
    if (results.some((result) => !result.passed)) process.exitCode = 1;
  }
}());
