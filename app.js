(function (root) {
  'use strict';

  const Calendar = {
    getMonth(key) {
      if (typeof key !== 'string' || !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(key)) throw new Error('Mes no válido.');
      const [year, month] = key.split('-').map(Number);
      if (year < 1900 || year > 9999) throw new Error('El año debe estar entre 1900 y 9999.');
      const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const days = Array.from({ length }, (_, index) => {
        const day = index + 1;
        const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
        return { day, weekday, kind: weekday === 6 ? 'saturday' : weekday === 0 ? 'sunday' : 'weekday' };
      });
      return { year, month, days, offset: (days[0].weekday + 6) % 7, weekdayCount: days.filter((day) => day.kind === 'weekday').length };
    },
    shift(key, delta) {
      const { year, month } = this.getMonth(key);
      const date = new Date(Date.UTC(year, month - 1 + delta, 1));
      const next = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      this.getMonth(next);
      return next;
    },
    label(key) {
      const { year, month } = this.getMonth(key);
      return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
    },
    today() {
      const now = new Date();
      return { month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, day: now.getDate() };
    }
  };

  const clpFormatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const Money = {
    MAX: 1000000000000,
    validate(value) {
      if (!Number.isSafeInteger(value) || value < 0 || value > this.MAX) throw new Error('Ingresa pesos enteros entre $0 y $1.000.000.000.000.');
      return value;
    },
    parse(value) {
      const text = String(value).trim();
      if (!/^[0-9]+$/.test(text)) throw new Error('Ingresa un monto en pesos enteros, sin puntos ni decimales.');
      return this.validate(Number(text));
    },
    format(value) { return clpFormatter.format(value); },
    dailyRate(base, count) {
      this.validate(base);
      // Exact integer pesos: half-up rounding once, before multiplying selected days.
      return Math.floor((base + count / 2) / count);
    }
  };

  const Selection = {
    validate(selectedDays, length) {
      if (!Array.isArray(selectedDays) || new Set(selectedDays).size !== selectedDays.length || selectedDays.some((day) => !Number.isInteger(day) || day < 1 || day > length)) {
        throw new Error('La selección contiene días no válidos.');
      }
      return selectedDays;
    },
    toggle(selectedDays, day) {
      return (selectedDays.includes(day) ? selectedDays.filter((value) => value !== day) : [...selectedDays, day]).sort((a, b) => a - b);
    }
  };

  const Salary = {
    SATURDAY: 20000,
    SUNDAY: 25000,
    calculate(state, calendar = Calendar) {
      const month = calendar.getMonth(state.month);
      Money.validate(state.base); Money.validate(state.advance);
      Selection.validate(state.selectedDays, month.days.length);
      const selected = new Set(state.selectedDays);
      const counts = { weekday: 0, saturday: 0, sunday: 0 };
      month.days.forEach((day) => { if (selected.has(day.day)) counts[day.kind] += 1; });
      const dailyRate = Money.dailyRate(state.base, month.weekdayCount);
      const weekdayPay = counts.weekday * dailyRate;
      const saturdayPay = counts.saturday * this.SATURDAY;
      const sundayPay = counts.sunday * this.SUNDAY;
      const total = weekdayPay + saturdayPay + sundayPay;
      return {
        dailyRate, weekdayCount: month.weekdayCount,
        weekdays: counts.weekday, saturdays: counts.saturday, sundays: counts.sunday,
        weekdayPay, saturdayPay, sundayPay, total, balance: total - state.advance,
        roundingAdjustment: dailyRate * month.weekdayCount - state.base
      };
    }
  };

  class MonthRepository {
    constructor(storage) { this.storage = storage; }
    static key(month) { return `sueldo-simple:v1:${month}`; }
    load(month) {
      Calendar.getMonth(month);
      const raw = this.storage.getItem(MonthRepository.key(month));
      if (raw === null) return null;
      const value = JSON.parse(raw);
      if (!value || value.version !== 1 || value.month !== month || typeof value.name !== 'string' || value.name.length > 120) throw new Error('Registro guardado no válido.');
      Salary.calculate(value);
      return { month, base: value.base, advance: value.advance, name: value.name, selectedDays: [...value.selectedDays].sort((a, b) => a - b) };
    }
    save(state) {
      Salary.calculate(state);
      if (typeof state.name !== 'string' || state.name.length > 120) throw new Error('Nombre no válido.');
      this.storage.setItem(MonthRepository.key(state.month), JSON.stringify({ version: 1, ...state }));
    }
    remove(month) { this.storage.removeItem(MonthRepository.key(month)); }
  }

  const api = { Calendar, Money, Salary, Selection, MonthRepository };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Sueldo = api;
  if (typeof document === 'undefined') return;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  class SalaryView {
    constructor(calendar, money) {
      this.calendar = calendar; this.money = money;
      this.nodes = {};
      ['month', 'base', 'advance', 'name', 'calendar', 'month-label', 'selected-count', 'daily-rate', 'weekday-count', 'base-hint', 'base-error', 'advance-error', 'storage-status', 'storage-warning', 'rounding-note', 'weekdays-label', 'saturdays-label', 'sundays-label', 'weekday-pay', 'saturday-pay', 'sunday-pay', 'total', 'advance-total', 'balance', 'balance-label', 'balance-caption', 'balance-panel', 'print', 'previous', 'next', 'live-summary', 'clear', 'mobile-balance', 'mobile-balance-label', 'mobile-print'].forEach((id) => { this.nodes[id] = document.getElementById(id); });
    }
    populate(state) {
      this.nodes.month.value = state.month;
      this.nodes.base.value = state.base;
      this.nodes.advance.value = state.advance;
      this.nodes.name.value = state.name;
      this.nodes['month-label'].textContent = this.calendar.label(state.month);
      this.nodes.previous.disabled = state.month === '1900-01';
      this.nodes.next.disabled = state.month === '9999-12';
    }
    renderCalendar(state) {
      const month = this.calendar.getMonth(state.month);
      const today = this.calendar.today();
      const selected = new Set(state.selectedDays);
      const fragment = document.createDocumentFragment();
      const kindLabels = { weekday: 'día normal', saturday: 'sábado extra', sunday: 'domingo extra' };
      month.days.forEach((day, index) => {
        const button = element('button', `day ${day.kind}${selected.has(day.day) ? ' selected' : ''}`);
        button.type = 'button'; button.dataset.day = day.day;
        if (index === 0) button.style.gridColumnStart = month.offset + 1;
        button.setAttribute('aria-pressed', String(selected.has(day.day)));
        button.setAttribute('aria-label', `${day.day} de ${this.calendar.label(state.month)}, ${kindLabels[day.kind]}`);
        if (today.month === state.month && today.day === day.day) button.setAttribute('aria-current', 'date');
        button.append(element('span', 'day-number', String(day.day)), element('span', 'day-check', selected.has(day.day) ? '\u2713' : ''));
        fragment.append(button);
      });
      this.nodes.calendar.replaceChildren(fragment);
      this.updateSelection(state);
    }
    updateSelection(state) {
      const selected = new Set(state.selectedDays);
      this.nodes.calendar.querySelectorAll('[data-day]').forEach((button) => {
        const active = selected.has(Number(button.dataset.day));
        button.classList.toggle('selected', active);
        button.setAttribute('aria-pressed', String(active));
        button.querySelector('.day-check').textContent = active ? '\u2713' : '';
      });
      const count = selected.size;
      this.nodes['selected-count'].textContent = `${count} ${count === 1 ? 'día seleccionado' : 'días seleccionados'}`;
      this.nodes.clear.disabled = count === 0;
    }
    validation(errors) {
      ['base', 'advance'].forEach((key) => {
        this.nodes[key].classList.toggle('long-amount', this.nodes[key].value.length > 10);
        this.nodes[key].setAttribute('aria-invalid', String(Boolean(errors[key])));
        this.nodes[`${key}-error`].textContent = errors[key] || '';
        this.nodes[`${key}-error`].hidden = !errors[key];
      });
    }
    renderSummary(state, result) {
      const n = this.nodes;
      n.print.disabled = !result;
      n['mobile-print'].disabled = !result;
      if (!result) {
        ['daily-rate', 'weekday-pay', 'saturday-pay', 'sunday-pay', 'total', 'advance-total', 'balance'].forEach((id) => { n[id].textContent = '\u2014'; });
        n['balance-label'].textContent = 'Monto por calcular';
        n['mobile-balance-label'].textContent = 'Monto por calcular';
        n['mobile-balance'].textContent = '\u2014';
        n['balance-caption'].textContent = 'Revisa los montos ingresados.';
        n['base-hint'].textContent = 'Pesos chilenos'; n['rounding-note'].hidden = true;
        n['balance-panel'].dataset.status = 'invalid';
        n['live-summary'].textContent = 'Hay montos inválidos. El cálculo y la impresión están deshabilitados.';
        return;
      }
      const format = (id, value) => {
        n[id].textContent = this.money.format(value);
        n[id].classList.toggle('long-amount', n[id].textContent.length > 12);
      };
      format('daily-rate', result.dailyRate); format('weekday-pay', result.weekdayPay);
      format('saturday-pay', result.saturdayPay); format('sunday-pay', result.sundayPay);
      format('total', result.total); format('advance-total', state.advance); format('balance', result.balance);
      format('mobile-balance', result.balance);
      n['weekday-count'].textContent = `${result.weekdayCount} días hábiles este mes`;
      n['base-hint'].textContent = this.money.format(state.base);
      n['weekdays-label'].textContent = `Días normales (${result.weekdays})`;
      n['saturdays-label'].textContent = `Sábados extra (${result.saturdays})`;
      n['sundays-label'].textContent = `Domingos extra (${result.sundays})`;
      n['balance-label'].textContent = result.balance < 0 ? 'Abono en exceso' : result.balance === 0 ? 'Saldo al día' : 'Saldo pendiente';
      n['mobile-balance-label'].textContent = n['balance-label'].textContent;
      n['balance-caption'].textContent = result.balance < 0 ? 'El abono supera el sueldo calculado.' : result.balance === 0 ? 'Sin saldo pendiente en este mes.' : 'Total ganado menos el abono recibido.';
      n['balance-panel'].dataset.status = result.balance < 0 ? 'excess' : result.balance === 0 ? 'settled' : 'pending';
      n['rounding-note'].hidden = result.roundingAdjustment === 0;
      n['rounding-note'].textContent = `Redondeo diario: ${result.roundingAdjustment > 0 ? '+' : ''}${this.money.format(result.roundingAdjustment)} si trabajas los ${result.weekdayCount} días hábiles.`;
      n['live-summary'].textContent = `${state.selectedDays.length} días seleccionados. Total ${this.money.format(result.total)}. ${n['balance-label'].textContent}: ${this.money.format(result.balance)}.`;
    }
    storage(status, warning = '') {
      this.nodes['storage-status'].textContent = status;
      this.nodes['storage-status'].parentElement.dataset.saved = String(status === 'Guardado en este dispositivo');
      this.nodes['storage-warning'].textContent = warning;
      this.nodes['storage-warning'].hidden = !warning;
    }
  }

  class PrintService {
    constructor(calendar, money) { this.calendar = calendar; this.money = money; }
    prepare(state, result) {
      const article = document.getElementById('payslip');
      article.replaceChildren();
      article.append(element('p', 'print-brand', 'SUELDO SIMPLE'), element('h1', '', 'Liquidación de sueldo'), element('p', 'print-month', this.calendar.label(state.month)));
      const metadata = element('dl', 'print-meta');
      [['Trabajador/a', state.name.trim() || 'Sin nombre'], ['Moneda', 'Peso chileno (CLP)'], ['Fecha de emisión', new Intl.DateTimeFormat('es-CL').format(new Date())]].forEach(([label, value]) => {
        metadata.append(element('dt', '', label), element('dd', '', value));
      });
      article.append(metadata);
      const table = element('table', 'print-table');
      const head = element('thead'); const heading = element('tr');
      ['Concepto', 'Cantidad', 'Valor unitario', 'Monto'].forEach((text) => heading.append(element('th', '', text)));
      head.append(heading); table.append(head);
      const body = element('tbody');
      [
        ['Días normales', result.weekdays, result.dailyRate, result.weekdayPay],
        ['Sábados extra', result.saturdays, Salary.SATURDAY, result.saturdayPay],
        ['Domingos extra', result.sundays, Salary.SUNDAY, result.sundayPay]
      ].forEach(([label, count, rate, amount]) => {
        const row = element('tr');
        [label, String(count), this.money.format(rate), this.money.format(amount)].forEach((text) => row.append(element('td', '', text)));
        body.append(row);
      });
      table.append(body); article.append(table);
      const totals = element('dl', 'print-totals');
      [['Sueldo base mensual', state.base], ['Total ganado', result.total], ['Abono recibido', state.advance], [result.balance < 0 ? 'Abono en exceso' : 'Saldo pendiente', result.balance]].forEach(([label, amount]) => {
        totals.append(element('dt', '', label), element('dd', '', this.money.format(amount)));
      });
      article.append(totals, element('h2', '', 'Registro de días trabajados'));
      const month = this.calendar.getMonth(state.month);
      [['Días normales', 'weekday'], ['Sábados', 'saturday'], ['Domingos', 'sunday']].forEach(([label, kind]) => {
        const days = month.days.filter((day) => day.kind === kind && state.selectedDays.includes(day.day)).map((day) => day.day);
        article.append(element('p', 'print-dates', `${label}: ${days.length ? days.join(', ') : 'Ninguno'}.`));
      });
      article.append(element('p', 'print-note', `Valor día: ${this.money.format(state.base)} / ${result.weekdayCount} días hábiles, redondeado a ${this.money.format(result.dailyRate)}. Sábados y domingos se pagan solo como extras.`));
      if (result.roundingAdjustment !== 0) article.append(element('p', 'print-note', `Diferencia por redondeo al trabajar todos los días hábiles: ${this.money.format(result.roundingAdjustment)}.`));
      article.append(element('p', 'print-note', 'Resumen de pagos según los días registrados. Sin descuentos previsionales ni tributarios.'));
    }
    print(state, result) {
      this.prepare(state, result);
      const originalTitle = document.title;
      document.title = `Liquidacion-${state.month}${state.name.trim() ? `-${state.name.trim()}` : ''}`;
      window.addEventListener('afterprint', () => { document.title = originalTitle; }, { once: true });
      try { window.print(); } finally { document.title = originalTitle; }
    }
  }

  class SalaryController {
    constructor({ calendar, salary, repository, view, printer }) {
      Object.assign(this, { calendar, salary, repository, view, printer });
      this.state = null; this.result = null; this.storageBlocked = false;
    }
    defaults(month) { return { month, base: 400000, advance: 0, name: '', selectedDays: [] }; }
    start() {
      this.openMonth(this.calendar.today().month);
      const n = this.view.nodes;
      ['base', 'advance', 'name'].forEach((id) => n[id].addEventListener('input', () => this.recalculate()));
      n.month.addEventListener('change', () => {
        try { this.calendar.getMonth(n.month.value); this.openMonth(n.month.value); }
        catch (_) { n.month.value = this.state.month; }
      });
      n.previous.addEventListener('click', () => this.openMonth(this.calendar.shift(this.state.month, -1)));
      n.next.addEventListener('click', () => this.openMonth(this.calendar.shift(this.state.month, 1)));
      n.calendar.addEventListener('click', (event) => {
        const button = event.target.closest('[data-day]');
        if (!button) return;
        this.state.selectedDays = Selection.toggle(this.state.selectedDays, Number(button.dataset.day));
        this.view.updateSelection(this.state); this.recalculate();
      });
      document.getElementById('select-weekdays').addEventListener('click', () => {
        const days = this.calendar.getMonth(this.state.month).days.filter((day) => day.kind === 'weekday').map((day) => day.day);
        this.state.selectedDays = [...new Set([...this.state.selectedDays, ...days])].sort((a, b) => a - b);
        this.view.updateSelection(this.state); this.recalculate();
      });
      n.clear.addEventListener('click', () => {
        if (!window.confirm('¿Quitar todos los días seleccionados de este mes?')) return;
        this.state.selectedDays = []; this.view.updateSelection(this.state); this.recalculate();
      });
      [n.print, n['mobile-print']].forEach((button) => button.addEventListener('click', () => { if (this.result) this.printer.print(this.state, this.result); }));
      window.addEventListener('beforeprint', () => {
        document.body.classList.toggle('print-invalid', !this.result);
        if (this.result) this.printer.prepare(this.state, this.result);
      });
    }
    openMonth(month) {
      this.storageBlocked = false;
      let state = this.defaults(month);
      try { state = this.repository.load(month) || state; this.view.storage('Guardado en este dispositivo'); }
      catch (_) {
        this.storageBlocked = true;
        this.view.storage('Guardado no disponible', 'No se pudo leer el registro de este mes. Puedes calcular e imprimir; los datos existentes se conservarán y los cambios de esta sesión no se guardarán.');
      }
      this.state = state; this.view.populate(state); this.view.renderCalendar(state);
      this.recalculate(false);
    }
    recalculate(save = true) {
      const errors = {}; const amounts = {};
      ['base', 'advance'].forEach((key) => {
        try { amounts[key] = Money.parse(this.view.nodes[key].value); }
        catch (error) { errors[key] = error.message; }
      });
      this.view.validation(errors);
      if (Object.keys(errors).length) {
        this.result = null; this.view.renderSummary(this.state, null);
        if (!this.storageBlocked) this.view.storage('Cambios sin guardar: revisa los montos');
        return;
      }
      Object.assign(this.state, amounts, { name: this.view.nodes.name.value });
      this.result = this.salary.calculate(this.state, this.calendar);
      this.view.renderSummary(this.state, this.result);
      this.printer.prepare(this.state, this.result);
      if (save && !this.storageBlocked) {
        try { this.repository.save(this.state); this.view.storage('Guardado en este dispositivo'); }
        catch (_) { this.view.storage('Cambios sin guardar', 'No se pudieron guardar los cambios en este dispositivo. El cálculo y la impresión siguen disponibles.'); }
      }
    }
  }

  api.SalaryView = SalaryView; api.PrintService = PrintService; api.SalaryController = SalaryController;
  if (document.getElementById('salary-app')) {
    let storage;
    try { storage = window.localStorage; }
    catch (_) { storage = { getItem() { throw new Error('Storage unavailable'); } }; }
    const controller = new SalaryController({
      calendar: Calendar, salary: Salary, repository: new MonthRepository(storage),
      view: new SalaryView(Calendar, Money), printer: new PrintService(Calendar, Money)
    });
    controller.start();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window));
