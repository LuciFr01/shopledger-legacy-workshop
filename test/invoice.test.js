var test = require('node:test');
var assert = require('node:assert/strict');

var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');

function orderWithBilledTotals(items, coupon) {
  var billed = pricing.computeTotals(items, coupon || '');

  return {
    id: 1001,
    customer: 'Test Customer',
    paymentMode: 'cash',
    items: items,
    coupon: coupon || '',
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  };
}

test('an HSN-only order uses the billed HSN slab on the invoice', function () {
  var items = [{
    id: 1,
    name: 'Rice',
    sku: 'RICE-1',
    hsn: '1006',
    price: 100,
    qty: 1
  }];
  var order = orderWithBilledTotals(items);
  var invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.deepEqual({
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.tax,
    cgst: pricing.computeTotals(items, '').cgst,
    sgst: pricing.computeTotals(items, '').sgst,
    total: order.total
  }, {
    subtotal: 100,
    discount: 0,
    tax: 5,
    cgst: 2.5,
    sgst: 2.5,
    total: 105
  });
  assert.deepEqual({
    subtotal: invoiceFigures.subtotal,
    discount: invoiceFigures.discount,
    tax: invoiceFigures.tax,
    cgst: invoiceFigures.cgst,
    sgst: invoiceFigures.sgst,
    total: invoiceFigures.total,
    gstPercent: invoiceFigures.rows[0].gstPercent
  }, {
    subtotal: 100,
    discount: 0,
    tax: 5,
    cgst: 2.5,
    sgst: 2.5,
    total: 105,
    gstPercent: 5
  });
  assert.equal(invoiceFigures.total, order.total);
});

test('a flat coupon is deducted before GST on the invoice', function () {
  var items = [{
    id: 2,
    name: 'General item',
    sku: 'GEN-1',
    hsn: '',
    price: 500,
    qty: 1
  }];
  var order = orderWithBilledTotals(items, 'FLAT50');
  var invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.deepEqual({
    subtotal: order.subtotal,
    discount: order.discount,
    taxable: pricing.computeTotals(items, 'FLAT50').taxable,
    tax: order.tax,
    total: order.total
  }, {
    subtotal: 500,
    discount: 50,
    taxable: 450,
    tax: 81,
    total: 531
  });
  assert.deepEqual({
    subtotal: invoiceFigures.subtotal,
    discount: invoiceFigures.discount,
    tax: invoiceFigures.tax,
    cgst: invoiceFigures.cgst,
    sgst: invoiceFigures.sgst,
    total: invoiceFigures.total
  }, {
    subtotal: 500,
    discount: 50,
    tax: 81,
    cgst: 40.5,
    sgst: 40.5,
    total: 531
  });
  assert.equal(invoiceFigures.total, order.total);
  assert.equal(invoiceFigures.rows[0].lineTax, 81);
});

test('a percentage coupon uses its capped discount and HSN slab on the invoice', function () {
  var items = [{
    id: 5,
    name: 'Groundnut oil',
    sku: 'OIL-002',
    hsn: '1508',
    price: 1120,
    qty: 2
  }];
  var order = orderWithBilledTotals(items, 'SAVE10');
  var invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.deepEqual({
    subtotal: invoiceFigures.subtotal,
    discount: invoiceFigures.discount,
    tax: invoiceFigures.tax,
    total: invoiceFigures.total,
    gstPercent: invoiceFigures.rows[0].gstPercent,
    lineTax: invoiceFigures.rows[0].lineTax
  }, {
    subtotal: 2240,
    discount: 150,
    tax: 104.5,
    total: 2194.5,
    gstPercent: 5,
    lineTax: 104.5
  });
  assert.equal(invoiceFigures.total, order.total);
});
