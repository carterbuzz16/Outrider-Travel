import type { Metadata } from "next";
import Link from "next/link";
import { ASSUMPTION_OF_RISK } from "@/lib/legal";
import { CONTACT, LEGAL_NAME } from "@/lib/site-content";
import LegalDocument, { LegalList, LegalSection } from "../legal/LegalDocument";

/**
 * Assumption of Risk, Release and Waiver of Liability.
 *
 * The most consequential document on the site and the one least safe to take
 * from a template: it asks travellers to give up claims arising from an
 * activity that injures and kills people every season, and whether any of it
 * is enforceable is a question of the law of a particular state.
 *
 * Two things are deliberately true of the draft below. It is written to be
 * understood, a release a court finds ambiguous or buried protects nobody, and
 * one a traveller does not understand is not consent in any sense worth having.
 * And it says out loud, in the page itself, where it may not hold: waiver law
 * varies by state, several states limit or void pre-injury releases, and
 * essentially none of them enforce a release against gross negligence.
 *
 * Nothing in the application currently records a traveller signing this. See
 * the flag in the acknowledgement section.
 */

export const metadata: Metadata = {
  title: ASSUMPTION_OF_RISK.title,
  description: ASSUMPTION_OF_RISK.description,
};

export default function AssumptionOfRiskPage() {
  return (
    <LegalDocument doc={ASSUMPTION_OF_RISK}>
      <LegalSection doc={ASSUMPTION_OF_RISK} id="what-this-is">
        <p>
          <strong>
            This is a legal document that affects your rights. Read all of it
            before you sign it.
          </strong>{" "}
          It asks you to accept the risks of skiing, snowboarding and mountain
          travel, and to give up the right to bring certain legal claims against
          Outrider if you are hurt, made ill, or lose property on a trip.
        </p>
        <p>
          It is written plainly on purpose. A release nobody understands is not
          worth having, from either side. If any part of it is unclear, ask us at{" "}
          {CONTACT.email} before you sign, or take it to your own lawyer. If you
          are not willing to accept these terms, do not book a trip, that is a
          perfectly reasonable decision and no one will argue with it.
        </p>
        <p>
          It forms part of{" "}
          <Link href="/terms">the Terms of Service</Link> and is read together
          with them.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="applies-to">
        <p>
          In this document, <strong>&ldquo;Outrider&rdquo;</strong> means{" "}
          {LEGAL_NAME}, its owners, officers, employees, contractors,
          guides, trip staff, volunteers, agents, successors and assigns.
          <strong> &ldquo;I&rdquo;</strong> and{" "}
          <strong>&ldquo;me&rdquo;</strong> mean the traveller signing, and also
          that person&rsquo;s heirs, next of kin, executors, administrators,
          assigns and personal representatives.
        </p>
        <p>
          <strong>&ldquo;The trip&rdquo;</strong> means the whole Outrider
          departure and everything in and around it: lodging, transport,
          skiing and snowboarding on and off marked terrain, lift use, lessons
          and guiding, meals, events, and any free time or activity taking place
          during the trip dates, whether or not it is an organised part of the
          itinerary and whether or not Outrider staff are present.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="snow-risks">
        <p>
          <strong>
            Skiing and snowboarding are dangerous. People are seriously injured
            and killed doing them every season, including people who are
            experienced, careful and well equipped.
          </strong>{" "}
          Those dangers are inherent: they cannot be removed without removing the
          activity, and no amount of care by Outrider, a resort, a guide or an
          instructor eliminates them.
        </p>
        <p>
          I understand that the risks of the trip include, but are not limited
          to:
        </p>
        <LegalList
          items={[
            <>
              <strong>Snow and terrain.</strong> Changing and unpredictable snow
              conditions; ice, crust, slush, powder, wind slab and breakable
              surfaces; moguls; variable and steep terrain; cliffs, drop-offs,
              gullies, cornices and creek beds; rocks, stumps, trees, tree wells
              and deep-snow immersion, which can cause suffocation.
            </>,
            <>
              <strong>Obstacles, natural and man-made.</strong> Lift towers,
              snow-making equipment and the snow it produces, hydrants, fences,
              signs, ropes, padding, buildings, snow-grooming and other
              machinery operating on the mountain, and terrain-park features.
            </>,
            <>
              <strong>Collisions.</strong> With other skiers and snowboarders,
              with objects, and with the ground, including collisions caused by
              other people who are out of control, inattentive, unskilled or
              impaired, over whom Outrider has no control whatsoever.
            </>,
            <>
              <strong>Avalanche.</strong> Avalanches, sloughs and snow slides,
              in-bounds and out-of-bounds, including burial, trauma and
              suffocation; avalanche control work; and delayed or unavailable
              rescue.
            </>,
            <>
              <strong>Lifts.</strong> Loading, riding and unloading chairlifts,
              gondolas, surface lifts and trams; falls from lifts; mechanical
              failure; and being stopped, stranded or evacuated from a lift in
              cold conditions.
            </>,
            <>
              <strong>Off-piste, backcountry and uncontrolled terrain.</strong>{" "}
              Terrain that is not patrolled, not marked, not controlled for
              avalanche hazard and not swept at the end of the day, where rescue
              can be slow, difficult or impossible.
            </>,
            <>
              <strong>Weather, altitude and exposure.</strong> Extreme cold,
              wind, storms, whiteout and flat light, poor visibility, sun and
              snow glare; frostbite and hypothermia; and the effects of altitude,
              including headache, nausea, sleeplessness, dehydration, acute
              mountain sickness and, rarely, life-threatening pulmonary or
              cerebral oedema. The resorts Outrider visits sit well above the
              elevations most travellers live at.
            </>,
            <>
              <strong>My own equipment and its behaviour.</strong> Bindings that
              release when they should not, or fail to release when they should;
              equipment failure of any kind; and injury caused by my own or
              another person&rsquo;s equipment.
            </>,
            <>
              <strong>My own judgement and condition.</strong> Fatigue, over-
              confidence, skiing beyond my ability, misjudging conditions, and
              the effect of alcohol, medication, illness or altitude on my
              decisions.
            </>,
            <>
              <strong>Delay or absence of help.</strong> Slow or unavailable
              rescue, first aid, ski patrol, evacuation or medical treatment;
              distance from a hospital; and the limits of care available in a
              mountain town.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="travel-risks">
        <p>
          The trip is more than the skiing, and the rest of it carries risk too.
          I understand and accept the risks of:
        </p>
        <LegalList
          items={[
            <>
              travel on mountain roads and passes in winter, snow, ice, poor
              visibility, avalanche closures, road closures, accidents involving
              our vehicle or another, and the acts of other drivers;
            </>,
            <>
              air travel, delay, cancellation, diversion, and lost or damaged
              baggage;
            </>,
            <>
              illness, including food-borne illness and contagious disease
              transmitted in shared accommodation, vehicles and lifts;
            </>,
            <>
              accidents in and around lodging, slips on ice and snow, stairs,
              hot tubs, saunas and pools, and fire;
            </>,
            <>
              theft, loss of or damage to my property, including skis,
              snowboards, phones and luggage;
            </>,
            <>
              being in a remote place where medical care, communications and
              transport are limited, and where evacuation can be slow and
              expensive;
            </>,
            <>
              acts of other travellers on the trip, of local people, and of third
              parties, over whom Outrider has no control.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="assumption">
        <p>
          <strong>
            I have read the risks described above, I understand them, and I
            expressly and voluntarily assume all of them, both the ones listed
            and any others inherent in the trip, whether or not anyone has
            described them to me, and whether or not they are foreseeable.
          </strong>
        </p>
        <p>
          I am taking part in this trip of my own free will, for my own
          enjoyment, and with full knowledge that it is dangerous. Nobody has
          told me the trip is safe. I accept that I may be seriously injured,
          permanently disabled, or killed, and that my property may be lost or
          destroyed. I accept full responsibility for that outcome and for my own
          decisions on the mountain and off it.
        </p>
        <p>
          I understand that the state where a trip takes place may have a ski
          safety statute that allocates certain inherent risks of skiing to me by
          law, in addition to anything I agree to here.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="fitness">
        <p>I confirm that:</p>
        <LegalList
          items={[
            <>
              I am in sufficient physical condition and health to take part in
              the trip and in the activities I intend to do on it, and I have
              consulted a doctor if there is any reason to think otherwise;
            </>,
            <>
              I have honestly assessed my own skiing or riding ability and will
              choose terrain and conditions accordingly, and will not follow
              others onto terrain beyond me;
            </>,
            <>
              I have told Outrider, in writing before departure, about any
              medical condition, injury, allergy, medication, pregnancy or
              limitation that could affect my safety or the safety of others,
              and I will update that if it changes;
            </>,
            <>
              I understand Outrider staff, guides and instructors are not
              physicians, and that a briefing, a lesson or a guide does not make
              a dangerous activity safe;
            </>,
            <>
              I understand altitude affects people unpredictably and that arriving
              from sea level increases that risk;
            </>,
            <>
              I am responsible for deciding, at every moment of the trip, whether
              to take part in any activity, and I will stop if I judge it unsafe
              for me.
            </>,
          ]}
        />
        <p>
          Outrider may refuse to let me take part in an activity, or may remove
          me from one, if in its judgement I am not fit for it or my
          participation endangers me or anyone else. That is a decision made for
          safety and does not entitle me to a refund.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="equipment">
        <p>
          Where equipment is rented as part of a trip, it is supplied and fitted
          by an independent rental shop under its own rental agreement, which I
          enter into directly with that shop and which contains its own terms
          about fitting, release settings and liability. Outrider does not
          manufacture, service, fit or inspect equipment.
        </p>
        <p>
          I am responsible for checking that my equipment, rented or my own, is
          suitable and in working order, for wearing a helmet if I choose to and
          for understanding that a helmet does not prevent serious injury or
          death, and for carrying and knowing how to use avalanche equipment on
          any terrain where it is needed.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="release">
        <p>
          <strong>
            To the fullest extent permitted by law, I release, waive, discharge
            and covenant not to sue Outrider for any claim, demand, loss, injury,
            illness, disability, death, or damage to or loss of property arising
            out of or relating to my participation in the trip, including any
            such claim caused in whole or in part by the ordinary negligence of
            Outrider.
          </strong>
        </p>
        <p>
          This release covers claims I might bring myself and claims brought by
          anyone claiming through me, including my family, heirs and personal
          representatives. It survives the trip.
        </p>
        <p>
          <strong>What this release does not cover.</strong> It does not release
          Outrider from liability for gross negligence, recklessness, wilful or
          wanton misconduct, or intentional wrongdoing, and it does not release
          any liability that the applicable law does not permit to be released. It
          does not affect any claim I may have against a third party, a resort,
          a hotel, a rental shop, a transport operator, another skier, which
          remains mine to bring.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="indemnity">
        <p>
          <strong>
            To the fullest extent permitted by law, I agree to indemnify, defend
            and hold Outrider harmless from any claim, liability, loss, damage,
            cost or expense, including reasonable legal fees, brought by me or
            by a third party arising out of my participation in the trip, my
            conduct on it, my breach of the Terms of Service or of this document,
            or any inaccurate or incomplete information I gave about my health,
            fitness or ability.
          </strong>
        </p>
        <p>
          This includes the cost of any search, rescue, evacuation or emergency
          medical transport carried out for me, and any charge a supplier passes
          on to Outrider because of something I did.
        </p>
        <p>
          It does not apply to the extent a claim arises from Outrider&rsquo;s own
          gross negligence, recklessness or intentional misconduct.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="medical">
        <p>
          If I am injured or become ill on the trip and cannot consent for
          myself, I authorise Outrider staff, ski patrol, guides and emergency
          responders to arrange and consent to medical care, first aid, ambulance
          transport, evacuation and hospital treatment on my behalf.
        </p>
        <p>
          <strong>
            I am financially responsible for the full cost of any medical care,
            search, rescue, evacuation or repatriation provided to me
          </strong>{" "}, not Outrider. Mountain rescue and air evacuation are expensive, and
          the trip price does not cover them.
        </p>
        <p>
          Outrider is not responsible for the quality, availability, timeliness
          or outcome of medical care provided by anyone else, and arranging care
          in an emergency does not make Outrider responsible for it. I authorise
          Outrider to share relevant health information with medical personnel
          and with my emergency contact, and I will keep an up-to-date emergency
          contact on file.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="media">
        <p>
          Outrider photographs and films its trips. I grant Outrider permission
          to record my image, likeness and voice during the trip, and a
          non-exclusive, royalty-free, worldwide licence to use that material to
          promote Outrider, on its website, in social media, in email and in
          printed material, without further approval or payment.
        </p>
        <p>
          I understand I will not be identified by full name without my
          agreement, and that I can ask for a specific image or clip of me to be
          taken down by emailing {CONTACT.email}. We will remove it from
          material we control, though we cannot recall something already shared
          onward by someone else.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="insurance">
        <p>
          I understand that any travel protection plan included in my trip price
          is provided by an independent insurer, that the insurer&rsquo;s policy
          documents decide what is covered, and that Outrider is not the insurer
          and does not decide claims. See{" "}
          <Link href="/terms#insurance">the Terms of Service</Link>.
        </p>
        <p>
          <strong>
            I am responsible for carrying insurance adequate for what I am doing.
          </strong>{" "}
          I understand that an included plan may not cover off-piste,
          out-of-bounds, backcountry, heli- or cat-skiing, racing, emergency
          evacuation from a mountain, or treatment once I am home, and that my
          own health insurance may not cover me away from home. I accept that if
          I am uninsured or underinsured, the loss is mine.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="conduct">
        <p>
          I will not ski, ride or take part in any activity while impaired by
          alcohol, cannabis, medication or any other substance. I understand
          that impairment increases the risk of serious injury to me and to other
          people, that altitude intensifies the effect of alcohol, and that
          insurance commonly excludes claims involving intoxication.
        </p>
        <p>
          I will follow the instructions of Outrider staff, guides, instructors,
          drivers and resort personnel, observe posted closures, rope lines and
          the skier responsibility code, and behave in a way that does not
          endanger or seriously disrupt other people. I understand that I may be
          removed from the trip without a refund if I do not, as set out in the
          Terms of Service.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="minors">
        <p>
          Where a traveller is under 18, this document must be signed by a parent
          or legal guardian, who signs both on their own behalf and on behalf of
          the minor, and who accepts responsibility for the minor&rsquo;s conduct
          and supervision on the trip.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="law">
        <p>
          The governing law and venue for any dispute about this document are the
          same as those in{" "}
          <Link href="/terms#governing-law">the Terms of Service</Link>, and both
          documents are to be read consistently.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="severability">
        <p>
          If any part of this document is held invalid or unenforceable, that
          part is to be limited or removed to the minimum extent necessary, and
          the rest of it remains in full force and effect. In particular, if a
          release of ordinary negligence is unenforceable in the applicable
          jurisdiction, the assumption of risk, indemnity, medical authorisation
          and every other provision continue to apply, and the release continues
          to apply to the fullest extent that jurisdiction does permit.
        </p>
        <p>
          This document is intended to be as broad and inclusive as the law
          allows, and it binds my heirs, next of kin, executors, administrators,
          assigns and personal representatives. It survives the end of the trip.
        </p>
      </LegalSection>

      <LegalSection doc={ASSUMPTION_OF_RISK} id="acknowledgement">
        <p>
          <strong>
            By signing, I confirm that I have read this entire document, that I
            understand it is a release of liability and a contract, that I
            understand what I am giving up, that no one has made any promise or
            representation to me other than what is written in it, and that I
            sign it freely and voluntarily.
          </strong>
        </p>
        <p>
          Questions before you sign:{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. Related
          documents: <Link href="/terms">Terms of Service</Link> ·{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
