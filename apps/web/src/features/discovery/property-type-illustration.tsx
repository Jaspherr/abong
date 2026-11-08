import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { PROPERTY_TYPE_ORDER } from "@/constants/listing";
import { cn } from "@/lib/utils";
import type { PropertyType } from "@/types";
import { AssemblyStage } from "./line-assembly";
import type { ShowcaseDirection } from "./use-idle-showcase";

/** Thin secondary lines: glazing, slats and other detail that sits behind the main drawing. */
function Fine({ children }: { children: ReactNode }) {
  return (
    <g strokeWidth="0.7" opacity="0.45">
      {children}
    </g>
  );
}

function Ground() {
  return <path d="M43 309H477M56 315H158M372 315H464" />;
}

/** A framed window with a centre mullion, and a transom unless `plain`. */
function Window({
  x,
  y,
  width,
  height,
  plain,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  plain?: boolean;
}) {
  return (
    <>
      <rect x={x} y={y} width={width} height={height} />
      <path
        d={
          plain
            ? `M${x + width / 2} ${y}V${y + height}`
            : `M${x + width / 2} ${y}V${y + height}M${x} ${y + height / 2}H${x + width}`
        }
      />
    </>
  );
}

const range = (count: number, start: number, step: number) =>
  Array.from({ length: count }, (_, index) => start + index * step);

/** Doors off an open gallery, reached by an outside stair: rooms let one by one. */
function BoardingHouse() {
  const rooms = range(4, 124, 72);

  return (
    <>
      {/* Gabled roof with a vent */}
      <path d="M92 140L260 62L428 140H92Z" />
      <path d="M110 132L260 72L410 132" />
      <rect x="244" y="92" width="32" height="22" />
      <Fine>
        <path d="M244 99.5H276M244 106.5H276" />
      </Fine>

      {/* Walls and floors */}
      <path d="M110 140V300M410 140V300" />
      <path d="M100 215H420M100 221H420" />
      <path d="M95 300H477" />

      {/* Upper rooms, seen over the gallery rail */}
      {rooms.map((x) => (
        <g key={x}>
          <path d={`M${x} 191V152H${x + 24}V191`} />
          <rect x={x + 32} y="158" width="28" height="26" />
          <path d={`M${x + 46} 158V184`} />
        </g>
      ))}

      {/* Lower rooms */}
      {rooms.map((x) => (
        <g key={x}>
          <rect x={x} y="237" width="24" height="63" />
          <circle cx={x + 19} cy="270" r="1.4" />
          <Window x={x + 32} y={243} width={28} height={26} plain />
        </g>
      ))}

      {/* Gallery rail */}
      <path d="M110 191H410" />
      <Fine>
        <path
          d={range(19, 125, 15)
            .map((x) => `M${x} 191V215`)
            .join("")}
        />
      </Fine>

      {/* Outside stair up to the gallery */}
      <path d="M410 215L462 300M422 215L474 300" />
      <path d="M410 191L462 276" />
      <path d="M462 276V300" />
      <Fine>
        <path
          d={range(5, 418, 10)
            .map((x) => {
              const y = 215 + ((x - 410) * 85) / 52;
              return `M${x} ${y}H${x + 12}`;
            })
            .join("")}
        />
        <path d="M428 220V244M445 248V272" />
      </Fine>

      <Ground />
    </>
  );
}

/** One bed in a shared room: the double-deck frame, its ladder, and a locker of your own. */
function Bedspace() {
  return (
    <>
      {/* Floor */}
      <path d="M43 309H477" />
      <Fine>
        <path d="M43 315H477" />
      </Fine>

      {/* Window */}
      <Window x={52} y={108} width={46} height={72} />
      <path d="M47 184H103" />

      {/* Bed frame */}
      <path d="M120 70V309M127 70V309M333 70V309M340 70V309" />
      <path d="M120 70H127M333 70H340" />

      {/* Upper deck */}
      <path d="M127 125H333M127 137H333" />
      <rect x="130" y="103" width="200" height="22" rx="5" />
      <rect x="138" y="90" width="46" height="13" rx="5" />
      <path d="M127 78H226M127 86H226" />
      <path d="M226 78V103" />

      {/* Lower deck */}
      <path d="M127 247H333M127 259H333" />
      <rect x="130" y="225" width="200" height="22" rx="5" />
      <rect x="138" y="212" width="46" height="13" rx="5" />
      <Fine>
        <path d="M250 103V125M250 225V247" />
      </Fine>

      {/* Ladder */}
      <path d="M340 84H372M346 84V309M372 84V309" />
      <path
        d={range(7, 112, 30)
          .map((y) => `M346 ${y}H372`)
          .join("")}
      />

      {/* Locker */}
      <rect x="405" y="130" width="60" height="179" />
      <path d="M435 130V309M405 220H465" />
      <path d="M429 180V192M441 180V192M429 266V278M441 266V278" />
      <Fine>
        <path d="M412 142H428M412 148H428M442 142H458M442 148H458M412 232H428M412 238H428M442 232H458M442 238H458" />
      </Fine>
    </>
  );
}

/** One private room, seen from its doorway: bed, lamp, desk and a door that closes. */
function Room() {
  return (
    <>
      {/* The room box, in one-point perspective */}
      <rect x="150" y="70" width="220" height="160" />
      <path d="M150 230L43 309M370 230L477 309M43 309H477" />
      <path d="M150 70L81 20M370 70L439 20" />

      {/* Floorboards, stopping where the bed starts */}
      <Fine>
        <path d="M157 230L55 309M192.5 270L170.5 309M260 270V309M285 230L310 309M315 230L369 309" />
      </Fine>

      {/* Window with curtains */}
      <Window x={172} y={92} width={86} height={66} />
      <path d="M164 86H266" />
      <Fine>
        <path d="M172 86C176 110 168 136 174 166M180 86C184 110 178 136 184 166M258 86C254 110 262 136 256 166M250 86C246 110 252 136 246 166" />
      </Fine>

      {/* Bed, head against the back wall */}
      <path d="M165 208V180H265V208" />
      <path d="M165 208H265L267.5 237H117.5L165 208Z" />
      <rect x="117.5" y="237" width="150" height="33" />
      <rect x="172" y="196" width="42" height="13" rx="5" />
      <rect x="218" y="196" width="42" height="13" rx="5" />
      <Fine>
        <path d="M146 220H266" />
      </Fine>

      {/* Bedside table and lamp */}
      <rect x="272" y="200" width="26" height="30" />
      <path d="M272 214H298M285 200V182M275 182L279 168H291L295 182H275Z" />

      {/* Door */}
      <rect x="312" y="118" width="46" height="112" />
      <rect x="318" y="124" width="34" height="42" />
      <circle cx="351" cy="180" r="1.8" />

      {/* Desk along the side wall */}
      <path d="M403 192L447 204H396L364 192H403Z" />
      <path d="M396 204V209H447M364 192V254M396 209V286M447 209V286" />
      <Fine>
        <path d="M403 192V254" />
      </Fine>
    </>
  );
}

/** A long managed block: the same window repeated, floor after floor, around one stair core. */
function Dormitory() {
  const floors = [131, 176, 221, 266];
  const windows = [...range(5, 72, 29), ...range(5, 307, 29)];

  return (
    <>
      {/* Block and parapet */}
      <path d="M60 300V120H225M295 120H460V300" />
      <path d="M52 114H225M295 114H468M52 114V120H60M468 114V120H460" />
      <path d="M60 165H225M295 165H460M60 210H225M295 210H460M60 255H225M295 255H460" />
      <path d="M45 300H475" />

      {/* Rooms */}
      {floors.flatMap((y) =>
        windows.map((x) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="22" height="26" />
          </g>
        )),
      )}
      <Fine>
        <path
          d={floors
            .flatMap((y) => windows.map((x) => `M${x + 11} ${y}V${y + 26}`))
            .join("")}
        />
      </Fine>

      {/* Stair core */}
      <path d="M225 300V85H295V300" />
      <path d="M217 85H303M217 79H303M217 79V85M303 79V85" />
      <rect x="245" y="100" width="30" height="145" />
      <Fine>
        <path
          d={range(9, 114, 14.5)
            .map((y) => `M245 ${y}H275`)
            .join("")}
        />
      </Fine>

      {/* Entrance */}
      <path d="M215 255H305M215 250H305M215 250V255M305 250V255" />
      <rect x="240" y="262" width="40" height="38" />
      <path d="M260 262V300" />
      <path d="M232 300V305H288V300" />

      {/* Path to the door */}
      <path d="M43 309H232M288 309H477" />
      <Fine>
        <path d="M232 305L214 330M288 305L306 330" />
      </Fine>
    </>
  );
}

/** One open room cut away like a section: CR, kitchenette and bed under the same roof. */
function Studio() {
  return (
    <>
      {/* Walls and slab, cut through */}
      <path d="M60 300V70H460V300M68 300V78H452V300" />
      <path d="M50 70H470M50 64H470M50 64V70M470 64V70" />
      <path d="M52 300H468M52 306H468" />
      <Fine>
        <path d="M43 315H477" />
      </Fine>

      {/* CR, behind its own partition */}
      <path d="M150 78V300M156 78V300" />
      <rect x="76" y="232" width="16" height="34" />
      <path d="M92 258H120C120 276 110 282 106 286V300H88V266" />
      <path d="M92 252H122" />
      <path d="M140 78V112H124" />
      <path d="M116 112H132L128 118H120L116 112Z" />
      <Fine>
        <path d="M120 124V136M124 128V144M128 124V136" />
      </Fine>

      {/* Kitchenette */}
      <rect x="168" y="240" width="112" height="60" />
      <path d="M205 240V300M242 240V300M162 240H286M162 236H286" />
      <path d="M198 262V274M212 262V274M249 262V274" />
      <path d="M186 236V222C186 213 200 213 200 222" />
      <rect x="168" y="130" width="62" height="46" />
      <path d="M199 130V176M192 148V158M206 148V158" />
      <path d="M238 182L247 150H271L280 182H238Z" />
      <path d="M253 150V78M265 150V78" />
      <path d="M248 228H274V236H248ZM244 228H278" />

      {/* Bed under the window */}
      <Window x={335} y={120} width={90} height={82} />
      <path d="M328 206H432" />
      <rect x="300" y="250" width="148" height="22" rx="5" />
      <rect x="304" y="272" width="140" height="14" />
      <path d="M312 286V300M436 286V300" />
      <rect x="408" y="237" width="36" height="13" rx="5" />
      <Fine>
        <path d="M368 250V272" />
      </Fine>
    </>
  );
}

/** Attached units under sawtooth roofs: each with its own front door and its own balcony. */
function Apartment() {
  const units = range(3, 66, 129);

  return (
    <>
      {/* Sawtooth roofline and party walls */}
      <path d="M66 112L195 72V112L324 72V112L453 72V112" />
      <path d="M60 112H459" />
      <path d="M66 112V300M195 112V300M324 112V300M453 112V300" />
      <path d="M56 300H464" />

      {units.map((x) => (
        <g key={x}>
          {/* Sliding doors onto the balcony */}
          <path d={`M${x + 24} 178V128H${x + 105}V178M${x + 64.5} 128V178`} />

          {/* Balcony */}
          <path d={`M${x + 10} 178H${x + 119}M${x + 10} 178V205M${x + 119} 178V205`} />
          <path d={`M${x + 6} 205H${x + 123}M${x + 6} 211H${x + 123}`} />
          <Fine>
            <path
              d={range(9, x + 21, 11)
                .map((baluster) => `M${baluster} 178V205`)
                .join("")}
            />
          </Fine>

          {/* Front door with its own awning and step */}
          <path d={`M${x + 14} 224H${x + 60}L${x + 56} 230H${x + 18}L${x + 14} 224Z`} />
          <rect x={x + 20} y="230" width="34" height="70" />
          <circle cx={x + 47} cy="266" r="1.6" />
          <path d={`M${x + 16} 300V305H${x + 58}V300`} />

          {/* Front window */}
          <Window x={x + 70} y={234} width={44} height={38} plain />
        </g>
      ))}

      <Ground />
    </>
  );
}

/** A managed tower on a podium, with a lobby, a second tower behind and palms at the kerb. */
function Condominium() {
  const floors = range(13, 44, 16);

  return (
    <>
      {/* Second tower, set back */}
      <Fine>
        <path d="M330 92H416V245M416 92V82H346V92" />
        <path
          d={range(9, 108, 16)
            .map((y) => `M336 ${y}H416`)
            .join("")}
        />
        <path d="M356 92V245M376 92V245M396 92V245" />
      </Fine>

      {/* Main tower */}
      <rect x="190" y="28" width="140" height="217" />
      <path d="M200 28V14H320V28" />
      <path d="M240 14V6H280V14" />
      <Fine>
        <path d="M225 28V245M260 28V245M295 28V245" />
      </Fine>
      <path d={floors.map((y) => `M190 ${y}H330`).join("")} />

      {/* Corner balconies */}
      <path d={floors.map((y) => `M330 ${y}H341`).join("")} />
      <path d="M341 44V236" />

      {/* Podium */}
      <path d="M110 300V245H410V300" />
      <path d="M102 245H418M102 240H418M102 240V245M418 240V245" />
      <path d="M90 300H430" />
      {[...range(3, 122, 22), ...range(3, 340, 22)].map((x) => (
        <rect key={x} x={x} y="258" width="14" height="28" />
      ))}

      {/* Lobby */}
      <path d="M216 256H304L314 264H206L216 256Z" />
      <path d="M222 264V300M298 264V300" />
      <rect x="236" y="268" width="48" height="32" />
      <path d="M260 268V300" />

      {/* Palms */}
      <path d="M68 309C71 272 66 248 70 222" />
      <path d="M70 222C58 212 46 216 40 228M70 222C62 208 50 202 42 206M70 222C76 208 88 202 98 208M70 222C82 214 94 218 100 230" />
      <path d="M454 309C451 278 456 260 452 240" />
      <path d="M452 240C442 232 432 236 427 246M452 240C446 228 436 224 430 228M452 240C457 228 467 224 475 229M452 240C462 234 471 238 476 247" />

      <Ground />
    </>
  );
}

/** A whole house on its own plot: two floors, a side extension and a garden. */
function House() {
  return (
    <>
      {/* Main building structure */}
      <path d="M100 285V100H351V285" />
      <path d="M94 100H357" />
      <path d="M108 93H343" />
      <path d="M108 93V100M343 93V100" />

      {/* Side extension */}
      <path d="M351 150H436V285" />
      <path d="M345 144H442" />
      <path d="M436 150V285" />

      {/* Horizontal building divisions */}
      <path d="M100 191H351" />
      <path d="M100 198H351" />

      {/* Architectural columns */}
      <path d="M118 100V285" />
      <path d="M333 100V285" />

      {/* Upper windows */}
      <rect x="144" y="121" width="59" height="52" />
      <rect x="248" y="121" width="59" height="52" />

      {/* Window frames */}
      <path d="M173.5 121V173M144 147H203" />
      <path d="M277.5 121V173M248 147H307" />

      {/* Lower windows */}
      <rect x="144" y="218" width="59" height="48" />
      <path d="M173.5 218V266M144 242H203" />

      {/* Main entrance */}
      <path d="M245 285V216H307V285" />
      <path d="M251 285V222H301V285" />
      <path d="M285 222V285" />
      <circle cx="293" cy="256" r="1.8" />

      {/* Side extension windows */}
      <rect x="373" y="174" width="39" height="39" />
      <rect x="373" y="229" width="39" height="39" />
      <path d="M392.5 174V213M373 193.5H412" />
      <path d="M392.5 229V268M373 248.5H412" />

      {/* Building base */}
      <path d="M85 285H453" />
      <path d="M90 291H448" />

      {/* Steps */}
      <path d="M237 285V294H316V285" />
      <path d="M229 294V301H324V294" />
      <path d="M219 301H334" />

      {/* Roof detailing */}
      <path d="M119 110H331" />
      <path d="M359 160H430" />

      {/* Left landscaping */}
      <path d="M72 285V249" />
      <path d="M72 249C51 249 47 226 61 215" />
      <path d="M72 249C91 243 95 222 81 210" />
      <path d="M72 231C59 222 61 208 69 204" />
      <path d="M72 232C85 226 87 211 79 203" />

      {/* Right landscaping */}
      <path d="M463 285V253" />
      <path d="M463 253C447 250 446 232 455 225" />
      <path d="M463 253C480 247 484 232 473 222" />
      <path d="M463 240C454 231 456 220 461 215" />

      <Ground />

      {/* Fine architectural details */}
      <g strokeWidth="0.7" opacity="0.4">
        <path d="M137 121V173M210 121V173" />
        <path d="M241 121V173M314 121V173" />
        <path d="M137 218V266M210 218V266" />
        <path d="M94 88H357" />
        <path d="M94 88V94M357 88V94" />
        <path d="M359 139H440" />
      </g>
    </>
  );
}

/** A Record, so adding a property type won't compile until it has a drawing. */
const ILLUSTRATIONS: Record<PropertyType, ComponentType> = {
  "boarding-house": BoardingHouse,
  bedspace: Bedspace,
  room: Room,
  dormitory: Dormitory,
  studio: Studio,
  apartment: Apartment,
  condominium: Condominium,
  house: House,
};

/**
 * Line drawing of the chosen property type. Every drawing stays mounted in one grid cell,
 * so the panel can't resize between types.
 *
 * With motion allowed, each drawing is built line by line: the pieces gather from all
 * around and lock into place, and the previous drawing comes apart as the next one forms
 * (see `line-assembly.ts`). The pieces live in a layer React never renders into, so a
 * build costs no renders. `direction` (1 forward, -1 back) sets which side the new pieces
 * gather from and the old ones leave toward.
 *
 * With reduced motion, the original drawings simply swap, and `gentle` softens changes
 * nobody asked for.
 */
export function PropertyTypeIllustration({
  type,
  gentle,
  direction = 1,
  className,
}: {
  type: PropertyType;
  gentle?: boolean;
  direction?: ShowcaseDirection;
  className?: string;
}) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animated = !reducedMotion;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<AssemblyStage | null>(null);

  useEffect(() => {
    if (!animated || !rootRef.current) return;
    const stage = new AssemblyStage(rootRef.current);
    stageRef.current = stage;
    return () => {
      stage.destroy();
      stageRef.current = null;
    };
  }, [animated]);

  // Declared after the stage's effect, so on mount the stage exists by the time this runs.
  useEffect(() => {
    stageRef.current?.show(type, direction);
  }, [animated, type, direction]);

  return (
    <div
      ref={rootRef}
      data-assembly={animated ? "lines" : "static"}
      className={cn("grid text-foreground", className)}
      aria-hidden="true"
    >
      {PROPERTY_TYPE_ORDER.map((option) => {
        const Illustration = ILLUSTRATIONS[option];
        const active = option === type;

        return (
          <svg
            key={option}
            data-property-illustration={option}
            data-active={active}
            viewBox="0 0 520 350"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
              "h-auto w-full overflow-visible [grid-area:1/1]",
              !animated && [
                "transition-opacity duration-300 ease-soft",
                active ? "opacity-100" : "opacity-0",
                active && gentle && "delay-200 duration-700",
              ],
            )}
          >
            {/* One opacity for the whole drawing, so lines that cross or meet don't darken where they overlap. */}
            <g
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.6"
            >
              {/* The original drawing: shown as is without motion, and the blueprint the pieces are cut from. */}
              <g data-drawing-source="" visibility={animated ? "hidden" : undefined}>
                <Illustration />
              </g>
              {animated && <g data-drawing-layer="" />}
            </g>
          </svg>
        );
      })}
    </div>
  );
}
