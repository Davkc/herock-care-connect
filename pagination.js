// Numbered pages and optional continuous scrolling for a directory search.
function Pager({mount, pageSize, maxResults, infinite, fetchPage, renderItems, onPageChange, onMode, onError}){
  const maxPages = Math.ceil(maxResults / pageSize);
  let page = 1;
  let hasMore = false;
  let visibleCount = 0;
  let loaded = false;
  let request;
  let failed;
  let observer;

  mount.innerHTML = `
    <p class="pgstatus" role="status"></p>
    <div class="pgrow" role="group" aria-label="Result pages" hidden>
      <button type="button" class="pg" data-act="first">First</button>
      <button type="button" class="pg" data-act="prev">Previous</button>
      <span class="pgrow pgNumbers"></span>
      <button type="button" class="pg" data-act="next">Next</button>
    </div>
    <button type="button" class="pg" data-act="more" hidden>Load more</button>
    <button type="button" class="pg" data-act="retry" hidden>Try again</button>
    <p class="pgnote" hidden>Reached the directory’s limit for one search. Refine your ZIP code, city, or specialty to see other results.</p>
    <label class="pgmode"><input type="checkbox" id="pgInf"> Keep scrolling for more results</label>
    <div class="sentinel" aria-hidden="true"></div>`;
  const status = mount.querySelector(".pgstatus");
  const pages = mount.querySelector('[aria-label="Result pages"]');
  const numbers = mount.querySelector(".pgNumbers");
  const mode = mount.querySelector("#pgInf");
  const buttons = Object.fromEntries([...mount.querySelectorAll("[data-act]")].map(button => [button.dataset.act, button]));
  mode.checked = infinite;

  function draw(){
    observer?.disconnect();
    observer = null;
    const canNext = hasMore && page < maxPages;
    const from = infinite ? 1 : (page - 1) * pageSize + 1;
    const focusPage = numbers.contains(document.activeElement) ? document.activeElement.dataset.page : null;
    status.textContent = request ? "Loading results…"
      : failed ? loaded ? "Could not load that page. The current results are still available." : "Could not reach the directory."
      : visibleCount ? `Showing ${from}–${from + visibleCount - 1}` : "";
    pages.hidden = infinite || !loaded || (!canNext && page === 1);
    buttons.first.disabled = buttons.prev.disabled = !!request || page === 1;
    buttons.next.disabled = !!request || !canNext;
    buttons.more.hidden = !infinite || !canNext;
    buttons.more.disabled = !!request || !!failed;
    buttons.retry.hidden = !failed;
    mount.querySelector(".pgnote").hidden = !hasMore || page < maxPages;
    const end = canNext ? page + 1 : page;
    const start = Math.max(1, end - 4);
    numbers.innerHTML = Array.from({length: end - start + 1}, (_, index) => {
      const number = start + index;
      return `<button type="button" class="pg" data-page="${number}" aria-label="Page ${number}" ${number === page ? 'aria-current="page"' : ""} ${request ? "disabled" : ""}>${number}</button>`;
    }).join("");
    if (focusPage && !request) numbers.querySelector(`[data-page="${focusPage}"]`)?.focus();
    if (infinite && canNext && !request && !failed && "IntersectionObserver" in window) {
      const activeObserver = new IntersectionObserver(entries => {
        if (observer === activeObserver && entries.some(entry => entry.isIntersecting)) {
          load(page + 1, true);
        }
      }, {rootMargin: "400px 0px"});
      observer = activeObserver;
      observer.observe(mount.querySelector(".sentinel"));
    }
  }

  async function load(target, append, scroll = false){
    const controller = new AbortController();
    request = controller;
    failed = null;
    draw();
    try {
      const result = await fetchPage(target, controller.signal);
      if (controller.signal.aborted) return;
      page = target;
      hasMore = result.hasMore;
      visibleCount = renderItems(result.items, append);
      loaded = true;
      request = null;
      draw();
      if (scroll) onPageChange();
    } catch {
      if (controller.signal.aborted) return;
      request = null;
      failed = {target, append, scroll};
      draw();
      if (!loaded) onError();
    }
  }

  mount.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || request) return;
    const {act, page: number} = button.dataset;
    if (number && Number(number) !== page) load(Number(number), false, true);
    if (act === "first") load(1, false, true);
    if (act === "prev") load(page - 1, false, true);
    if (act === "next") load(page + 1, false, true);
    if (act === "more") load(page + 1, true);
    if (act === "retry" && failed) load(failed.target, failed.append, failed.scroll);
  });

  mode.addEventListener("change", () => {
    infinite = mode.checked;
    onMode(infinite);
  });

  function hide(){
    request?.abort();
    request = null;
    observer?.disconnect();
    observer = null;
    mount.hidden = true;
  }

  function start(){
    hide();
    page = 1;
    hasMore = loaded = false;
    visibleCount = 0;
    mount.hidden = false;
    return load(1, false);
  }

  return {start, hide};
}
