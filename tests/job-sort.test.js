const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('public/js/main.js', 'utf8');
const start = source.indexOf('function compareLastPrintRows(a, b){');
const end = source.indexOf('\nfunction setJobSortChips', start);
assert.notEqual(start, -1, 'last-printed comparator is present');
assert.notEqual(end, -1, 'last-printed comparator has an end marker');

const context = { $: row => ({ data: key => row[key] }) };
vm.runInNewContext(source.slice(start, end), context);

function sortRows(rows){
	return rows.slice().sort(context.compareLastPrintRows).map(row => row.id);
}

const chronological = [
	{id: 'never', sortLastprint: 0, sortId: 90},
	{id: 'five-weeks', sortLastprint: 3024000, sortId: 10},
	{id: 'ten-minutes', sortLastprint: 600, sortId: 1},
	{id: 'two-days', sortLastprint: 172800, sortId: 30},
	{id: 'five-hours', sortLastprint: 18000, sortId: 20}
];
assert.deepEqual(sortRows(chronological), [
	'ten-minutes', 'five-hours', 'two-days', 'five-weeks', 'never'
]);

const neverPrinted = [
	{id: 'never-older-id', sortLastprint: 0, sortId: 4},
	{id: 'printed', sortLastprint: 600, sortId: 2},
	{id: 'never-newer-id', sortLastprint: 0, sortId: 9}
];
assert.deepEqual(sortRows(neverPrinted), [
	'printed', 'never-newer-id', 'never-older-id'
]);

const equalPrintTimes = [
	{id: 'id-3', sortLastprint: 600, sortId: 3},
	{id: 'id-8', sortLastprint: 600, sortId: 8},
	{id: 'id-5', sortLastprint: 600, sortId: 5}
];
assert.deepEqual(sortRows(equalPrintTimes), ['id-8', 'id-5', 'id-3']);

console.log('Passed: chronological ages, multiple never-printed rows, equal ages, descending PlateID tie-break.');
