// Shared feed loader for the Dashboard popover and full News & Updates view.
(function () {
  'use strict';
  var toggle = document.getElementById('updates-toggle');
  var popover = document.getElementById('updates-popover');
  var list = document.getElementById('updates-list');
  var fullPage = document.getElementById('c3d-news-page');
  var fullList = document.getElementById('c3d-news-list');
  var dashboardHead = document.querySelector('.c3d-dash-head');
  var dashboardMain = document.querySelector('.c3d-dash-main');
  var FEED_URL = 'https://dashboard.concepts3d.eu/dashboard.html';
  var loaded = false;

  if (fullPage && new URLSearchParams(window.location.search).get('news') === '1') {
    if (dashboardHead) dashboardHead.hidden = true;
    if (dashboardMain) dashboardMain.hidden = true;
    fullPage.hidden = false;
  }
  if ((!toggle || !popover || !list) && (!fullPage || !fullList)) return;

  function safeUrl(value) {
    if (!value) return '';
    try {
      var url = new URL(value, FEED_URL);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (e) {
      return '';
    }
  }

  function parseFeed(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.prototype.map.call(doc.querySelectorAll('.update-item'), function (item) {
      var heading = item.querySelector('h2');
      var paragraphs = Array.prototype.map.call(item.querySelectorAll('p'), function (p) {
        return (p.textContent || '').replace(/\s+/g, ' ').trim();
      }).filter(Boolean);
      var anchor = item.querySelector('a[href]');
      var image = item.querySelector('img[src]');
      var date = item.querySelector('time[datetime], time, .update-date, .date');
      return {
        title: heading ? heading.textContent.trim() : '',
        body: paragraphs.join('\n\n'),
        date: date ? date.textContent.trim() : '',
        image: image ? safeUrl(image.getAttribute('src')) : '',
        imageAlt: image ? image.getAttribute('alt') || '' : '',
        link: anchor ? safeUrl(anchor.getAttribute('href')) : ''
      };
    });
  }

  function truncate(text, max) {
    text = (text || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    return text.slice(0, max - 1).replace(/\s+\S*$/, '') + '\u2026';
  }

  function makeLink(parent, href, className, label) {
    if (!href) return;
    var link = document.createElement('a');
    link.className = className;
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    parent.appendChild(link);
  }

  function appendEmpty(target, message) {
    target.textContent = '';
    var empty = document.createElement('div');
    empty.className = 'c3d-updates-empty';
    empty.textContent = message;
    target.appendChild(empty);
  }

  function renderPopover(items) {
    if (!list) return;
    list.textContent = '';
    if (!items.length) {
      appendEmpty(list, 'No news yet');
      return;
    }
    items.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'c3d-updates-item';
      var title = document.createElement('div');
      title.className = 'c3d-updates-item-title';
      title.textContent = item.title;
      el.appendChild(title);
      var body = document.createElement('div');
      body.className = 'c3d-updates-item-body';
      body.textContent = truncate(item.body, 180);
      el.appendChild(body);
      makeLink(el, item.link, 'c3d-updates-item-link', 'Read more');
      list.appendChild(el);
    });
  }

  function renderFull(items) {
    if (!fullList) return;
    fullList.textContent = '';
    if (!items.length) {
      appendEmpty(fullList, 'No news yet');
      return;
    }
    items.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'c3d-news-card';
      if (item.image) {
        var image = document.createElement('img');
        image.className = 'c3d-news-card-image';
        image.src = item.image;
        image.alt = item.imageAlt;
        image.loading = 'lazy';
        card.appendChild(image);
      }
      var content = document.createElement('div');
      content.className = 'c3d-news-card-content';
      if (item.date) {
        var date = document.createElement('div');
        date.className = 'c3d-news-card-date';
        date.textContent = item.date;
        content.appendChild(date);
      }
      if (item.title) {
        var title = document.createElement('h2');
        title.className = 'c3d-news-card-title';
        title.textContent = item.title;
        content.appendChild(title);
      }
      if (item.body) {
        var body = document.createElement('p');
        body.className = 'c3d-news-card-body';
        body.textContent = item.body;
        content.appendChild(body);
      }
      makeLink(content, item.link, 'c3d-updates-item-link', 'Read more');
      card.appendChild(content);
      fullList.appendChild(card);
    });
  }

  function load() {
    if (loaded) return;
    loaded = true;
    fetch(FEED_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(parseFeed)
      .then(function (items) {
        renderPopover(items);
        renderFull(items);
      })
      .catch(function () {
        if (list) appendEmpty(list, 'Could not load news');
        if (fullList) appendEmpty(fullList, 'Could not load news');
      });
  }

  function open() {
    load();
    popover.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
  }
  function close() {
    popover.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle && popover && list) {
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      if (popover.hidden) open(); else close();
    });
    document.addEventListener('click', function (e) {
      if (!popover.hidden && !popover.contains(e.target) && !toggle.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !popover.hidden) close();
    });
  }

  if (fullPage && fullList && !fullPage.hidden) load();
})();
