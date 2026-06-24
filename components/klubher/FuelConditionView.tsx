'use client';

// Fuel Condition — two measurement contexts in one page:
//
//   • Batch delivery (LCR-IQ inline meter on the delivery hose):
//       – Temperature       (°C)
//       – Water Contaminant (ppm + % saturation)
//       – Density           (kg/m³, diesel; N/A petrol)
//   • Circulation loop (particle counter on the recirc/filter loop):
//       – Cleanliness       (ISO 4406 — storage spec 18/16/13)
//
// Each panel shows the latest readout per tank plus a 7-day trend.

import { useMemo, useState } from 'react';
import KlubherNav from './KlubherNav';
import { Card } from '@/components/atoms';
import TrendLineChart from './TrendLineChart';
import {
  TEMP_THRESHOLDS,
  WATER_PPM_THRESHOLDS,
  WATER_SAT_THRESHOLDS,
  ISO_TARGET,
  DENSITY_THRESHOLDS,
  classifyTemp,
  classifyWaterPpm,
  classifyWaterSat,
  classifyCleanliness,
  classifyDensity,
  parseIsoCode,
  type Tank,
  type TankSeries,
  type SeriesPoint,
  type WaterStatus,
} from '@/lib/klubher-types';

type Sub = 'temperature' | 'water' | 'cleanliness' | 'density';
type Range = 24 | 72 | 168;

export default function FuelConditionView({
  tanks,
  series,
}: {
  tanks: Tank[];
  series: TankSeries[];
}) {
  const [sub, setSub] = useState<Sub>('temperature');
  const [selected, setSelected] = useState<string>(tanks[0]?.id ?? '');
  const [range, setRange] = useState<Range>(168);

  const selectedTank = tanks.find((t) => t.id === selected) ?? tanks[0];
  const selectedSeries = series.find((s) => s.tankId === selected);

  return (
    <main className="overview klubher-section klubher-condition">
      <div className="fuel-head">
        <div className="fuel-title-row">
          <span className="sys-icon-inline">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 14V5a2 2 0 10-4 0v9a4 4 0 104 0z" />
              <circle cx="12" cy="17" r="1.3" fill="currentColor" />
              <path d="M18 4l2.5 4a3 3 0 11-5 0z" />
            </svg>
          </span>
          <div>
            <div className="screen-title">Fuel Condition</div>
            <div className="screen-sub">
              Per delivery: Temperature · Water Contaminant · Density · In circulation: Cleanliness
            </div>
          </div>
        </div>
      </div>

      <KlubherNav active="condition" />

      <div className="klubher-condition-subnav">
        <div className="alerts-tabs">
          {([
            ['temperature', 'Temperature'],
            ['water',       'Water Contaminant'],
            ['cleanliness', 'Cleanliness'],
            ['density',     'Density'],
          ] as [Sub, string][]).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`tab ${sub === k ? 'active' : ''}`}
              onClick={() => setSub(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sub === 'temperature' && (
        <TemperaturePanel
          tanks={tanks}
          selected={selected}
          setSelected={setSelected}
          selectedTank={selectedTank}
          selectedSeries={selectedSeries}
          range={range}
          setRange={setRange}
        />
      )}
      {sub === 'water' && (
        <WaterPanel
          tanks={tanks}
          selected={selected}
          setSelected={setSelected}
          selectedTank={selectedTank}
          selectedSeries={selectedSeries}
          range={range}
          setRange={setRange}
        />
      )}
      {sub === 'cleanliness' && (
        <CleanlinessPanel
          tanks={tanks}
          selected={selected}
          setSelected={setSelected}
          selectedTank={selectedTank}
          selectedSeries={selectedSeries}
          range={range}
          setRange={setRange}
        />
      )}
      {sub === 'density' && (
        <DensityPanel
          tanks={tanks}
          selected={selected}
          setSelected={setSelected}
          selectedTank={selectedTank}
          selectedSeries={selectedSeries}
          range={range}
          setRange={setRange}
        />
      )}
    </main>
  );
}

// ----- shared bits ---------------------------------------------------------

function toneOf(s: WaterStatus): 'ok' | 'warn' | 'bad' {
  return s === 'Normal' ? 'ok' : s === 'Warning' ? 'warn' : 'bad';
}

function RangeStrip({ range, setRange }: { range: Range; setRange: (r: Range) => void }) {
  return (
    <div className="alerts-tabs">
      {([24, 72, 168] as Range[]).map((h) => (
        <button
          key={h}
          type="button"
          className={`tab ${range === h ? 'active' : ''}`}
          onClick={() => setRange(h)}
        >
          {h === 168 ? '7d' : `${h}h`}
        </button>
      ))}
    </div>
  );
}

function trimSeries(points: SeriesPoint[] | undefined, range: Range): SeriesPoint[] {
  return points ? points.filter((p) => p.hoursAgo < range) : [];
}

interface PanelProps {
  tanks: Tank[];
  selected: string;
  setSelected: (id: string) => void;
  selectedTank: Tank | undefined;
  selectedSeries: TankSeries | undefined;
  range: Range;
  setRange: (r: Range) => void;
}

// ----- Temperature --------------------------------------------------------

function TemperaturePanel(p: PanelProps) {
  const { tanks, selected, setSelected, selectedTank, selectedSeries, range, setRange } = p;
  const points = useMemo(() => trimSeries(selectedSeries?.temp, range), [selectedSeries, range]);

  return (
    <>
      <Card
        title="BATCH DELIVERY · TEMPERATURE"
        subtitle={`Normal ${TEMP_THRESHOLDS.normalMin}–${TEMP_THRESHOLDS.normalMax}°C · critical <${TEMP_THRESHOLDS.criticalMin} or >${TEMP_THRESHOLDS.criticalMax}°C`}
      >
        <div className="klubher-readout-grid">
          {tanks.map((t) => {
            const s = classifyTemp(t.tempC);
            const tone = toneOf(s);
            return (
              <ReadoutButton
                key={t.id}
                t={t}
                selected={selected === t.id}
                onClick={() => setSelected(t.id)}
                primaryValue={`${t.tempC.toFixed(1)}`}
                primaryUnit="°C"
                tone={tone}
                status={s}
              />
            );
          })}
        </div>
      </Card>

      <Card
        title={`TREND · ${selectedTank?.id ?? '—'}`}
        subtitle={selectedTank ? `Tank ${selectedTank.tankNumber} · last ${range === 168 ? '7 days' : `${range}h`}` : ''}
        actions={<RangeStrip range={range} setRange={setRange} />}
      >
        {points.length > 0 ? (
          <TrendLineChart
            series={points}
            unit="°C"
            band={{
              doubleSided: {
                warnMin: TEMP_THRESHOLDS.normalMin,
                warnMax: TEMP_THRESHOLDS.normalMax,
                criticalMin: TEMP_THRESHOLDS.criticalMin,
                criticalMax: TEMP_THRESHOLDS.criticalMax,
              },
            }}
            ariaLabel={`Temperature trend for Tank ${selectedTank?.tankNumber ?? ''}, last ${range} hours`}
          />
        ) : (
          <div className="klubher-empty">No data for this window.</div>
        )}
      </Card>
    </>
  );
}

// ----- Water Contaminant (ppm + sat%) ------------------------------------

function WaterPanel(p: PanelProps) {
  const { tanks, selected, setSelected, selectedTank, selectedSeries, range, setRange } = p;
  const [paramView, setParamView] = useState<'ppm' | 'sat'>('ppm');

  const ppmPoints = useMemo(() => trimSeries(selectedSeries?.waterPpm, range), [selectedSeries, range]);
  const satPoints = useMemo(() => trimSeries(selectedSeries?.waterSat, range), [selectedSeries, range]);

  return (
    <>
      <Card
        title="BATCH DELIVERY · WATER CONTAMINANT"
        subtitle={`Normal <${WATER_PPM_THRESHOLDS.warning} ppm · warning ≥${WATER_PPM_THRESHOLDS.warning} · critical ≥${WATER_PPM_THRESHOLDS.critical} · saturation critical ≥${WATER_SAT_THRESHOLDS.critical}%`}
      >
        <div className="klubher-readout-grid">
          {tanks.map((t) => {
            const ppmS = classifyWaterPpm(t.waterPpm);
            const satS = classifyWaterSat(t.waterSatPct);
            // The tile takes the worst of the two so the chip flags
            // either dimension reaching alert range.
            const worst: WaterStatus = ppmS === 'Critical' || satS === 'Critical' ? 'Critical'
              : ppmS === 'Warning' || satS === 'Warning' ? 'Warning' : 'Normal';
            return (
              <ReadoutButton
                key={t.id}
                t={t}
                selected={selected === t.id}
                onClick={() => setSelected(t.id)}
                primaryValue={`${Math.round(t.waterPpm)}`}
                primaryUnit="ppm"
                secondary={`${Math.round(t.waterSatPct)}% sat`}
                tone={toneOf(worst)}
                status={worst}
              />
            );
          })}
        </div>
      </Card>

      <Card
        title={`TREND · ${selectedTank?.id ?? '—'}`}
        subtitle={selectedTank ? `Tank ${selectedTank.tankNumber} · last ${range === 168 ? '7 days' : `${range}h`}` : ''}
        actions={
          <div className="klubher-actions">
            <div className="alerts-tabs">
              <button type="button" className={`tab ${paramView === 'ppm' ? 'active' : ''}`} onClick={() => setParamView('ppm')}>PPM</button>
              <button type="button" className={`tab ${paramView === 'sat' ? 'active' : ''}`} onClick={() => setParamView('sat')}>% Saturation</button>
            </div>
            <RangeStrip range={range} setRange={setRange} />
          </div>
        }
      >
        {paramView === 'ppm' && (
          ppmPoints.length > 0 ? (
            <TrendLineChart
              series={ppmPoints}
              unit=" ppm"
              band={{ warn: WATER_PPM_THRESHOLDS.warning, critical: WATER_PPM_THRESHOLDS.critical }}
              ariaLabel={`Water ppm trend for Tank ${selectedTank?.tankNumber ?? ''}, last ${range} hours`}
            />
          ) : <div className="klubher-empty">No data for this window.</div>
        )}
        {paramView === 'sat' && (
          satPoints.length > 0 ? (
            <TrendLineChart
              series={satPoints}
              unit="%"
              band={{ warn: WATER_SAT_THRESHOLDS.warning, critical: WATER_SAT_THRESHOLDS.critical }}
              ariaLabel={`Water saturation trend for Tank ${selectedTank?.tankNumber ?? ''}, last ${range} hours`}
            />
          ) : <div className="klubher-empty">No data for this window.</div>
        )}
      </Card>
    </>
  );
}

// ----- Cleanliness (ISO 4406) ---------------------------------------------

function CleanlinessPanel(p: PanelProps) {
  const { tanks, selected, setSelected, selectedTank, selectedSeries, range, setRange } = p;
  const points = useMemo(() => trimSeries(selectedSeries?.isoWorst, range), [selectedSeries, range]);
  // Trend-chart guide-line: target's 14 µm channel, parsed from the ISO
  // code above so chart + chip-classification stay in sync.
  const targetParts = parseIsoCode(ISO_TARGET);
  const warnChannel = targetParts ? targetParts[2] : 13;

  return (
    <>
      <Card
        title="CIRCULATION · CLEANLINESS (ISO 4406)"
        subtitle={`Storage spec ${ISO_TARGET} · sampled on the recirc / filter loop · channels are 4 µm / 6 µm / 14 µm`}
      >
        <div className="klubher-readout-grid">
          {tanks.map((t) => {
            const s = classifyCleanliness(t.isoCleanCode);
            const tone = toneOf(s);
            const parts = parseIsoCode(t.isoCleanCode);
            const target = parseIsoCode(ISO_TARGET);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                className={`klubher-readout ${selected === t.id ? 'is-selected' : ''} tone-${tone}`}
                aria-pressed={selected === t.id}
              >
                <div className="klubher-readout-id">{t.id}</div>
                <div className="klubher-readout-name">Tank {t.tankNumber}</div>
                <div className={`klubher-iso-code ${tone}`}>
                  {parts ? parts.map((n, i) => (
                    <span key={i} className={target && n > target[i] ? 'over' : 'ok'}>
                      {n}{i < 2 && <span className="klubher-iso-sep">/</span>}
                    </span>
                  )) : t.isoCleanCode}
                </div>
                <div className="klubher-iso-target">target {ISO_TARGET}</div>
                <span className={`klubher-chip klubher-chip-${tone}`}>{s}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card
        title={`TREND · ${selectedTank?.id ?? '—'} · 14 µm channel`}
        subtitle={selectedTank ? `Tank ${selectedTank.tankNumber} · worst-channel ISO 4406 code over the last ${range === 168 ? '7 days' : `${range}h`}` : ''}
        actions={<RangeStrip range={range} setRange={setRange} />}
      >
        {points.length > 0 ? (
          <TrendLineChart
            series={points}
            unit=""
            band={{ warn: warnChannel }}
            ariaLabel={`ISO 4406 worst-channel trend for Tank ${selectedTank?.tankNumber ?? ''}, last ${range} hours`}
          />
        ) : (
          <div className="klubher-empty">No data for this window.</div>
        )}
      </Card>
    </>
  );
}

// ----- Density ------------------------------------------------------------

function DensityPanel(p: PanelProps) {
  const { tanks, selected, setSelected, selectedTank, selectedSeries, range, setRange } = p;
  const points = useMemo(() => trimSeries(selectedSeries?.density, range), [selectedSeries, range]);

  return (
    <>
      <Card
        title="BATCH DELIVERY · DENSITY"
        subtitle={`Diesel band ${DENSITY_THRESHOLDS.normalMin}–${DENSITY_THRESHOLDS.normalMax} kg/m³ @15°C · warn ${DENSITY_THRESHOLDS.warningMin}–${DENSITY_THRESHOLDS.warningMax} · outside is critical · covers B0–B35 (B50/B100 extend up to 900)`}
      >
        <div className="klubher-readout-grid">
          {tanks.map((t) => {
            // Diesel only — petrol tanks show N/A until per-grade bands
            // are wired in (petrol sits ~720–770 kg/m³, outside the
            // diesel scale entirely).
            const isDiesel = t.fuelType === 'Diesel';
            if (!isDiesel) {
              return (
                <ReadoutButton
                  key={t.id}
                  t={t}
                  selected={selected === t.id}
                  onClick={() => setSelected(t.id)}
                  primaryValue="—"
                  primaryUnit=""
                  tone="na"
                  status="N/A"
                />
              );
            }
            const s = classifyDensity(t.densityKgM3);
            const tone = toneOf(s);
            return (
              <ReadoutButton
                key={t.id}
                t={t}
                selected={selected === t.id}
                onClick={() => setSelected(t.id)}
                primaryValue={`${t.densityKgM3.toFixed(1)}`}
                primaryUnit="kg/m³"
                tone={tone}
                status={s}
              />
            );
          })}
        </div>
      </Card>

      <Card
        title={`TREND · ${selectedTank?.id ?? '—'}`}
        subtitle={selectedTank ? `Tank ${selectedTank.tankNumber} · last ${range === 168 ? '7 days' : `${range}h`}` : ''}
        actions={<RangeStrip range={range} setRange={setRange} />}
      >
        {selectedTank && selectedTank.fuelType !== 'Diesel' ? (
          <div className="klubher-empty">N/A — density band is diesel-only for now.</div>
        ) : points.length > 0 ? (
          <TrendLineChart
            series={points}
            unit=" kg/m³"
            band={{
              doubleSided: {
                warnMin: DENSITY_THRESHOLDS.normalMin,
                warnMax: DENSITY_THRESHOLDS.normalMax,
                criticalMin: DENSITY_THRESHOLDS.warningMin,
                criticalMax: DENSITY_THRESHOLDS.warningMax,
              },
            }}
            ariaLabel={`Density trend for Tank ${selectedTank?.tankNumber ?? ''}, last ${range} hours`}
          />
        ) : (
          <div className="klubher-empty">No data for this window.</div>
        )}
      </Card>
    </>
  );
}

// ----- Tank readout button (shared by all three panels) ------------------

function ReadoutButton({
  t, selected, onClick, primaryValue, primaryUnit, secondary, tone, status,
}: {
  t: Tank;
  selected: boolean;
  onClick: () => void;
  primaryValue: string;
  primaryUnit: string;
  secondary?: string;
  tone: 'ok' | 'warn' | 'bad' | 'na';
  status: WaterStatus | 'N/A';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`klubher-readout ${selected ? 'is-selected' : ''} tone-${tone}`}
      aria-label={`${t.id} Tank ${t.tankNumber}, ${primaryValue} ${primaryUnit}, ${status}`}
      aria-pressed={selected}
    >
      <div className="klubher-readout-id">{t.id}</div>
      <div className="klubher-readout-name">Tank {t.tankNumber}</div>
      <div className={`klubher-readout-num ${tone}`}>
        {primaryValue}
        {primaryUnit && <span className="klubher-readout-unit">{primaryUnit}</span>}
      </div>
      {secondary && <div className="klubher-readout-secondary">{secondary}</div>}
      <span className={`klubher-chip klubher-chip-${tone === 'na' ? 'na' : tone}`}>{status}</span>
    </button>
  );
}
