<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
  
    // --- map iframe handle + debug state ---
    let mapFrame: HTMLIFrameElement | null = null;
    let lastHref = '';
    let hrefText = '';
    let centerText = '';
    let zoomText = '';
  
    const LAYER_ID = 'ch.so.afu.gewaesserschutz.schutzzonen';
    let schutzOn = false;

    function parseCenterAndZoom(href: string) {
        try {
        const u = new URL(href);
        let center = u.searchParams.get('c');
        let zoom = u.searchParams.get('s'); // zoom is "s"

        // also support params in hash if the app encodes them there
        if ((!center || !zoom) && u.hash) {
            const cMatch = u.hash.match(/(^|[&#])c=([^&]+)/);
            const sMatch = u.hash.match(/(^|[&#])s=([^&]+)/);
            if (cMatch) center = decodeURIComponent(cMatch[2]);
            if (sMatch) zoom = decodeURIComponent(sMatch[2]);
        }

        return { center, zoom };
        } catch {
        return { center: null, zoom: null };
        }
    }

    let lastAppliedSchutzOn: boolean | null = null;

    function whenQwc2Ready(cb: (q: any) => void) {
      const w = mapFrame?.contentWindow as any;
      if (!w) return;
      const tryRun = () => {
        const q = w.qwc2;
        if (q) { cb(q); return true; }
        return false;
      };
      if (tryRun()) return;
      w.addEventListener('QWC2ApiReady', () => tryRun(), { once: true });
      const id = setInterval(() => { if (tryRun()) clearInterval(id); }, 200);
    }

    function setSchutzzonen(on: boolean) {
      console.log("setSchutzzonen");
      whenQwc2Ready((q) => {
        const addThemeSublayer = q.addThemeSublayer ?? q.api?.addThemeSublayer;
        const setLayerVisibility = q.setLayerVisibility ?? q.api?.setLayerVisibility;

        console.log(q);
        console.log(addThemeSublayer);
        console.log(setLayerVisibility);

        if (on) {
          const st = q.getState?.();
          console.log(st.layers);

          const hasLayer = !!st?.layers?.flat?.some((l: any) => l?.name === LAYER_ID);
          if (!hasLayer && typeof addThemeSublayer === 'function') {
            console.log("ADD Layer....");
            console.log(q.getState()?.theme?.current);
            var theme = q.getState()?.theme?.current
            //addThemeSublayer(LAYER_ID);

            const LR = q.LayerRole ?? { THEME: 'THEME' };

            q.addLayer({
              id: LAYER_ID,
              name: LAYER_ID,
              role: LR.THEME,
              type: "wms",
              serverType: "qgis",
              url: theme.url,
              featureInfoUrl: "/api/v1/featureinfo/somap",
              LAYER_ID,
              queryLayers: [LAYER_ID],
              title: "Schutzzonen (Gewässerschutz)",
              version: "1.3.0",
              visibility: true,
              opacity: 122,
              queryable: true,
              infoFormats: 'text/xml',
              with_htmlcontent: true,
              legendUrl: "/api/v1/legend/somap?VERSION=1.3.0&LAYERFONTSIZE=9&ITEMFONTSIZE=9&LAYERTITLESPACE=0.5&LAYERSPACE=1&SERVICE=WMS&REQUEST=GetLegendGraphic&FORMAT=image%2Fpng&CRS=EPSG%3A2056&SRS=EPSG%3A2056&SLD_VERSION=1.1.0&WIDTH=200&HEIGHT=200&SCALE=377953&LAYER=ch.so.afu.gewaesserschutz.schutzzonen&STYLES=&FILTER=" 
            });   


          }
          if (typeof setLayerVisibility === 'function') setLayerVisibility(LAYER_ID, true);
        } else {
          //if (typeof setLayerVisibility === 'function') setLayerVisibility(LAYER_ID, false);
          q.removeLayer(LAYER_ID);

        }

        console.log("nachher");
        const st = q.getState?.();
        console.log(st);        
        console.log(st.layers);


      });
    }

    // Initialize the checkbox from the current map state
    function syncCheckboxFromState() {
      whenQwc2Ready((q) => {
        const st = q.getState?.();
        const present = !!st?.layers?.flat?.some((l: any) => l?.name === LAYER_ID && l?.visibility !== false);
        schutzOn = present;
      });
    }

    onMount(syncCheckboxFromState);

    $: if (schutzOn !== lastAppliedSchutzOn) {
      lastAppliedSchutzOn = schutzOn;
      setSchutzzonen(schutzOn);
    }

    onMount(() => {
        const poll = () => {
          try {
              const href = mapFrame?.contentWindow?.location?.href;
              if (href && href !== lastHref) {
              lastHref = href;
              hrefText = href;
              const { center, zoom } = parseCenterAndZoom(href);
              centerText = center ?? '(n/a)';
              zoomText = zoom ?? '(n/a)';

              // also log to console if you like
              console.log('[map] href:', hrefText);
              console.log('[map] center (c):', centerText);
              console.log('[map] zoom (s):', zoomText);
              }
          } catch {
              /* if errors occur here, the iframe isn't same-origin yet */
          }
        };

        const timer = setInterval(poll, 300);
        onDestroy(() => clearInterval(timer));
        window.addEventListener('beforeunload', () => clearInterval(timer));
    });

    import Accordion, { Panel, Header, Content } from '@smui-extra/accordion';
    import FormField from '@smui/form-field';
    import Checkbox from '@smui/checkbox';

    const items = [
    { title: 'Panel 1', body: 'Dummy content for panel 1.' },
    {
      title: 'Faktenblatt (GINES)',
      type: 'iframe',
      src: 'https://solothurn.gines.ch/embed/factsheet/8?locale=de&fix-disable=1&fix=undefined_12'
    },
    { title: 'Panel 3', body: 'Dummy content for panel 3.' },
    { title: 'Panel 4', body: 'Dummy content for panel 4.' },
    { title: 'Panel 5', body: 'Dummy content for panel 5.' },
    { title: 'Panel 6', body: 'Dummy content for panel 6.' }
  ];
</script>
  
<style>

    :root {
        --topbar-h: 100px;
        --redbar-h: 50px;
        --logo-left-h: 20px;
        --logo-right-h: 20px;
    }
    .topbar {
        height: var(--topbar-h);
        background: #fff;
        display: flex;
        align-items: center;       /* vertical center */
        justify-content: space-between;
        padding: 0 16px;
        gap: 16px;
        border-bottom: 1px solid rgba(0,0,0,0.08);
    }
    .topbar-left,
    .topbar-right {
        display: flex;
        align-items: center;
        min-width: 0;
    }
    .topbar-left img {
        height: var(--logo-left-h);
        width: auto;
    }
    .topbar-right img {
        height: var(--logo-right-h);
        width: auto;
    }
    .redbar {
        height: var(--redbar-h);
        background: rgb(204, 0, 0);
    }

    @media (max-width: 900px) {
        :root {
            --topbar-h: 72px;
            --logo-left-h: 32px;
            --logo-right-h: 32px;
        }
    }
    .layout {
        display: flex;
        width: 100vw;
        height: calc(100dvh - var(--topbar-h) - var(--redbar-h));
    }
    .left, .right {
        flex: 0 0 50%;
        min-width: 0;
        height: 100%;
        box-sizing: border-box;
    }
    .left { overflow: auto; padding: 8px 12px; }
    .right { border-left: 1px solid rgba(0,0,0,0.12); display: flex; min-height: 0; }
    iframe { display:block; flex:1 1 auto; width:100%; height:100%; border:0; min-height:0; }
  /* Add or keep this in the same <style> block you already have */
    .panel-frame {
    display: block;
    width: 100%;
    height: 70vh;   /* adjust as you like; left column scrolls if needed */
    border: 0;
  }
  .debug {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.85rem;
    line-height: 1.35;
    word-break: break-all;
  }
  .debug dt {
    font-weight: 600;
    margin-top: 0.25rem;
  }
  .debug dd {
    margin: 0 0 0.5rem 0;
  }
</style>
  
<div class="topbar">
    <div class="topbar-left">
        <img src="/logo_solothurn.png" alt="Logo Kanton Solothurn" />
    </div>
    <div class="topbar-right">
        <img src="/logo_raumdaten.png" alt="Logo Raumdaten" />
    </div>
</div>
<div class="redbar"></div>

<div class="layout">
  <div class="left">
    <Accordion>
      {#each items as item}
        <Panel>
          <Header>{item.title}</Header>
          <Content>
              {#if item.type === 'iframe'}
              <iframe
                class="panel-frame"
                src={item.src}
                title="Faktenblatt (GINES)"
                loading="lazy"
                referrerpolicy="no-referrer"
                allow="fullscreen"
              />
            {:else}
              <p>{item.body}</p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Inte
                r nec odio. Praesent libero. Sed cursus ante dapibus diam.
              </p>
            {/if}
          </Content>
        </Panel>
      {/each}
      <Panel>
        <Header>Karten (GIS)</Header>
        <Content>
          <FormField>
            <Checkbox bind:checked={schutzOn} on:change={onCheckboxChange}/>
            <label>Schutzzonen</label>
          </FormField>
          <p class="hint">Layer-ID: {LAYER_ID}</p>
        </Content>
      </Panel>
      <!-- Panel 8: Debug -->
      <Panel open>
          <Header>Debug Panel</Header>
          <Content>
          <dl class="debug">
              <dt>href</dt>
              <dd>
                  {#if hrefText}
                      <a href={hrefText} target="_blank" rel="noopener noreferrer">{hrefText}</a>
                  {:else}
                      (n/a)
                  {/if}
              </dd>
              <dt>center (c)</dt>
              <dd>{centerText || '(n/a)'}</dd>
              <dt>zoom (s)</dt>
              <dd>{zoomText || '(n/a)'}</dd>
          </dl>
          </Content>
      </Panel>
    </Accordion>
  </div>

  <div class="right">
      <iframe
      bind:this={mapFrame}
      src="/map"
      title="SO Map"
      style="width:100%;height:100%;border:0"
      loading="lazy"
    />
  </div>
</div>
  