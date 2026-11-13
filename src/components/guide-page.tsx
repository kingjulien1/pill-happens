import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenTextIcon } from "@phosphor-icons/react/dist/ssr/BookOpenText";
import { MoonStarsIcon } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { RocketLaunchIcon } from "@phosphor-icons/react/dist/ssr/RocketLaunch";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { DeviceMobileIcon } from "@phosphor-icons/react/dist/ssr/DeviceMobile";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import { GuideStartLink } from "@/components/guide-onboarding";
import { GuideOutline } from "@/components/guide-outline";
import { guideHeadingId } from "@/lib/guide-outline";
import { InstallAppButton } from "@/components/install-app-button";
import { DAILY_MOODS, DAILY_REFLECTION_MAX_LENGTH } from "@/lib/daily-check-in";
import { MEDICATION_CATEGORIES } from "@/lib/medication-categories";
import styles from "./guide-page.module.css";

const sections = [
  { id: "start", label: "Start Here" },
  { id: "daily-log", label: "Daily Log" },
  { id: "medications", label: "Medications" },
  { id: "goals", label: "Goals & Streaks" },
  { id: "check-in", label: "Check-Ins" },
  { id: "history", label: "History & Backups" },
  { id: "app", label: "The App" },
  { id: "questions", label: "Quick Answers" },
] as const;

function SectionHeading({
  id,
  icon,
  title,
  context,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  context: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <h2
        id={`${id}-title`}
        data-guide-outline-level="1"
        data-guide-outline-label={title}
        data-guide-outline-target={id}
      >
        <span className={styles.headingIcon} aria-hidden="true">
          {icon}
        </span>
        {title}
      </h2>
      <span>{context}</span>
    </div>
  );
}

function GuideDetail({
  title,
  context,
  icon,
  children,
  open,
}: {
  title: string;
  context?: string;
  icon?: ActionIconName;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details
      id={guideHeadingId("guide-detail", title)}
      className={styles.detail}
      open={open}
      data-guide-outline-anchor
      data-card-entry
    >
      <summary
        data-guide-outline-level="2"
        data-guide-outline-label={title}
        data-guide-outline-target={guideHeadingId("guide-detail", title)}
      >
        {icon && <ActionIcon name={icon} className="size-4" />}
        <span className={styles.detailTitle}>{title}</span>
        {context && <span className={styles.detailContext}>{context}</span>}
        <ActionIcon name="expand" className={styles.detailCaret} />
      </summary>
      <div className={styles.detailBody}>{children}</div>
    </details>
  );
}

function PageLink({ href, children }: { href: string; children: ReactNode }) {
  const content = (
    <>
      {children}
      <ActionIcon name="external" className="size-3.5" />
    </>
  );
  return href === "/" ? (
    <GuideStartLink className={styles.pageLink}>{content}</GuideStartLink>
  ) : (
    <Link href={href} className={styles.pageLink}>
      {content}
    </Link>
  );
}

export function GuidePage() {
  return (
    <article className={styles.page} data-guide-page="journal">
      <GuideOutline>
        <header className={styles.intro}>
          <span className={styles.eyebrow}>
            <BookOpenTextIcon size={20} weight="regular" aria-hidden="true" />
            Pill Happens / Your Journal
          </span>
          <h1>Journal guide</h1>
          <p>
            Start with the medications you use, then build a clear record of
            what you took and when. This guide walks through your first entry,
            daily goals and your morning and evening check-ins, with details
            close at hand when you need them. Learn how your tracking day works,
            revisit earlier entries, and keep a copy of your history. Follow the
            four starting steps, or choose a section and pick up from there.
          </p>
          <div className={styles.atAGlance} aria-label="Journal At A Glance">
            <div>
              <span>06:00</span>
              <small>New Day · Morning Check-In</small>
            </div>
            <div>
              <span>17:00</span>
              <small>Evening Check-In</small>
            </div>
            <div>
              <span>Your Timezone</span>
              <small>Set In Preferences</small>
            </div>
          </div>
        </header>

        <nav
          className={styles.contents}
          aria-label="Guide Contents"
          data-guide-inline-contents
        >
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.label}
            </a>
          ))}
        </nav>

        <section
          id="start"
          className={styles.section}
          aria-labelledby="start-title"
        >
          <SectionHeading
            id="start"
            icon={<RocketLaunchIcon size={18} weight="bold" />}
            title="Getting Started"
            context="Four Small Steps"
          />
          <ol className={styles.steps}>
            <li data-card-entry>
              <span className={styles.stepNumber}>01</span>
              <div>
                <h3
                  id={guideHeadingId("guide-start", "Add Your Medication")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Add Your Medication"}
                >
                  Add Your Medication
                </h3>
                <p>
                  Open Medications and choose <strong>Add a Medication</strong>.
                  Enter its name, strength in mg per unit, medication type, and
                  default quantity for new entries. Active Ingredient means the
                  Wirkstoff; leave it blank if you don’t know it. Add optional
                  labels with Categories, then choose a color and symbol you can
                  recognize quickly.
                </p>
                <PageLink href="/medications">Open Medications</PageLink>
              </div>
            </li>
            <li data-card-entry>
              <span className={styles.stepNumber}>02</span>
              <div>
                <h3
                  id={guideHeadingId("guide-start", "Record An Intake")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Record An Intake"}
                >
                  Record An Intake
                </h3>
                <p>
                  On Today, tap <strong>Log Intake</strong> or the empty entry
                  card. Choose the medication and quantity, check the calculated
                  mg, and save. Date Taken and Time Taken start at the current
                  time; change it when you are catching up on an earlier intake.
                </p>
                <PageLink href="/">Go To Today</PageLink>
              </div>
            </li>
            <li data-card-entry>
              <span className={styles.stepNumber}>03</span>
              <div>
                <h3
                  id={guideHeadingId(
                    "guide-start",
                    "Add A Goal, If You Want One",
                  )}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Add A Goal, If You Want One"}
                >
                  Add A Goal, If You Want One
                </h3>
                <p>
                  Goals are daily maximums you enter for an individual
                  medication. Choose the amount and dates that apply. The
                  journal compares that medication’s recorded total with your
                  chosen value.
                </p>
                <PageLink href="/goals">Open Goals</PageLink>
              </div>
            </li>
            <li data-card-entry>
              <span className={styles.stepNumber}>04</span>
              <div>
                <h3
                  id={guideHeadingId(
                    "guide-start",
                    "Leave An Evening Check-In",
                  )}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Leave A Check-In"}
                >
                  Leave A Check-In
                </h3>
                <p>
                  Morning is ready from the 06:00 reset; Evening opens at 17:00.
                  Each has its own saved entry and draft. A few words, one
                  morning sleep rating, or one evening mood is enough. Tap
                  either card to start, continue or edit that part of your day.
                </p>
                <a className={styles.pageLink} href="#check-in">
                  See The Check-In Fields
                  <ActionIcon name="loadMore" className="size-3.5" />
                </a>
              </div>
            </li>
          </ol>
        </section>

        <aside
          className={styles.startAction}
          aria-label="Start Your Daily Log"
          data-card-entry
        >
          <GuideStartLink className={styles.quickStart}>
            <ActionIcon name="shootingStar" className="size-[18px]" />
            Open My Daily Log
            <ActionIcon name="next" className="size-[18px]" />
          </GuideStartLink>
          <p>
            Reading on first can help you get familiar with the journal. You can
            also start now and come back anytime.
          </p>
        </aside>

        <section
          id="daily-log"
          className={styles.section}
          aria-labelledby="daily-log-title"
        >
          <SectionHeading
            id="daily-log"
            icon={<ActionIcon name="date" className="size-[18px]" />}
            title="Your Daily Log"
            context="Time & Details"
          />
          <div className={styles.panel}>
            <GuideDetail
              title="The Day Runs From 06:00 To 06:00"
              icon="calendar"
              open
            >
              <p>
                The time beside the date follows your journal’s timezone. An
                intake at 05:59 belongs to the previous tracking day; one at
                06:00 belongs to the new day. Your old records stay in Past Days
                when Today changes over.
              </p>
              <p>
                Change the timezone under{" "}
                <strong>Past Days → Preferences</strong>. This regroups intakes
                by their saved times; it does not change the moments you
                recorded. The calendar handles daylight-saving changes,
                including shorter and longer days.
              </p>
            </GuideDetail>
            <GuideDetail title="Logging &amp; Quantities" icon="record">
              <p>
                Quantity means the number of tablets, capsules, drops, pumps, or
                other units you took. Fractions work with a comma or dot, even
                when the quick steps use whole units. The displayed dose is the
                medication’s current strength per unit multiplied by the
                recorded quantity.
              </p>
              <div className={styles.example}>
                <span>For Example</span>
                <code>2 mg per unit × 0.5 units = 1 mg</code>
              </div>
              <p>
                Intake route records how you took that particular entry, such as
                Swallowed, Nasal or Sublingual. It stays separate from the
                medication’s tablet/capsule type and never changes the
                calculated dose. A new entry suggests that medication’s
                most-used recorded route, with Swallowed as the fallback. Leave
                it as Not specified when you do not want to record a route.
              </p>
              <p>
                The default quantity is only a starting value: check the actual
                amount each time. Each medication keeps its own totals; amounts
                from different medications are not combined into one dose.
              </p>
            </GuideDetail>
            <GuideDetail
              title="Backdating &amp; Correcting Entries"
              icon="edit"
            >
              <p>
                For an intake you forgot to record, change Date Taken and Time
                Taken before saving, or open its day in Past Days and choose
                <strong> Add Missed Intake</strong>. Check the time there too; a
                new entry opened from a past day starts at noon on that date.
              </p>
              <p>
                Tap an existing entry to edit its medication, intake route,
                quantity, or time. A time change immediately moves it into the
                appropriate day and stack. Deleting an intake has a separate
                confirmation. Future intake times cannot be saved.
              </p>
            </GuideDetail>
            <GuideDetail title="Pick Up Where You Left Off" icon="save">
              <p>
                Unfinished intake, medication, goal, morning or evening
                check-in, and preference forms keep a draft on this device.
                Close a dialog, reload, or reopen the app: your last screen and
                open form return with the values you entered. Each medication
                and past day keeps its own draft.
              </p>
              <p>
                Look for Draft Saved or Restored Draft below the fields. Save
                records the change in your journal and clears that draft; Reset
                Draft starts the form over. Closing a form keeps your work
                without recording an intake. Drafts stay on this browser or
                installed app and do not sync to another device. Clearing its
                site data removes them.
              </p>
            </GuideDetail>
            <GuideDetail
              title="How The Stacks Work"
              context="Rolling 13-Minute Windows"
              icon="history"
            >
              <p>
                Entries appear from earliest to latest by Date &amp; Time Taken.
                Intakes form a compact stack when each is no more than 13
                minutes after the previous one. Each intake extends the window
                by another 13 minutes, even when you entered it later.
              </p>
              <div className={styles.example}>
                <span>A Quick Example</span>
                <p>
                  08:00, 08:12, and 08:25 share a stack. An 08:39 intake starts
                  a new one.
                </p>
              </div>
              <p>
                Tap any visible card in a folded stack to show all of its
                intakes. Once the stack is open, tap any card to edit that
                intake. A folded stack previews up to six complete cards
                underneath the first one.
              </p>
              <p>
                <strong>Show Intakes</strong> reveals the whole group.
                <strong> Fold Intakes</strong> brings its cards back into one
                compact stack. These views never change recorded times,
                quantities, or which entries belong to the 13-minute group.
              </p>
              <p>
                Each stack’s open or folded state is remembered for each day on
                this device. Refresh, close the tab, or reopen the app to return
                to the same view. Other journals and recent days keep their own
                state.
              </p>
            </GuideDetail>
          </div>
        </section>

        <section
          id="medications"
          className={styles.section}
          aria-labelledby="medications-title"
        >
          <SectionHeading
            id="medications"
            icon={<ActionIcon name="medications" className="size-[18px]" />}
            title="Medication Details"
            context="One Familiar Marker Each"
          />
          <div className={styles.panel}>
            <GuideDetail
              title="Name, Ingredient, Strength &amp; Type"
              icon="navMedications"
            >
              <dl className={styles.reference}>
                <div>
                  <dt
                    id={guideHeadingId("guide-field", "Name")}
                    data-guide-outline-level="3"
                    data-guide-outline-label={"Name"}
                  >
                    Name
                  </dt>
                  <dd>The name you want to see throughout the journal.</dd>
                </div>
                <div>
                  <dt
                    id={guideHeadingId("guide-field", "Active Ingredient")}
                    data-guide-outline-level="3"
                    data-guide-outline-label={"Active Ingredient"}
                  >
                    Active Ingredient
                  </dt>
                  <dd>
                    An optional Wirkstoff name; it can be left blank or cleared.
                  </dd>
                </div>
                <div>
                  <dt
                    id={guideHeadingId("guide-field", "Strength")}
                    data-guide-outline-level="3"
                    data-guide-outline-label={"Strength"}
                  >
                    Strength
                  </dt>
                  <dd>
                    mg in one tablet, capsule, drop, pump, or chosen unit.
                  </dd>
                </div>
                <div>
                  <dt
                    id={guideHeadingId("guide-field", "Default Quantity")}
                    data-guide-outline-level="3"
                    data-guide-outline-label={"Default Quantity"}
                  >
                    Default Quantity
                  </dt>
                  <dd>
                    A prefilled amount for new intakes, which you can change
                    before saving.
                  </dd>
                </div>
                <div>
                  <dt
                    id={guideHeadingId("guide-field", "Medication Type")}
                    data-guide-outline-level="3"
                    data-guide-outline-label={"Medication Type"}
                  >
                    Medication Type
                  </dt>
                  <dd>
                    The presentation and counting unit: tablet, capsule, drops,
                    pump, or another form. This is separate from Categories.
                  </dd>
                </div>
              </dl>
            </GuideDetail>
            <GuideDetail
              title="Medication Categories"
              context="Your Own Labels"
              icon="sparkle"
            >
              <p>
                The Categories menu sits beside Active Ingredient and lists all{" "}
                {MEDICATION_CATEGORIES.length} labels directly. Scroll to browse
                or type a label to jump to it with your keyboard. Select as many
                as you want; each chosen row shows a check and “selected” while
                the menu stays open. Choose Done when finished, toggle a label
                again to remove it, or use Clear to leave the selection empty.
              </p>
              <p>
                These optional labels help organize your own medication list.
                More than one can be selected for the same item; you choose
                which ones are useful. Medication Type still describes its form
                and counting unit. Names and active ingredients never select
                categories automatically. Categories can be left empty.
              </p>
              <p>
                Earlier Benzo and Opioid markings carry over. They keep their
                pink and orange priority markers across intakes, history, goals,
                and medication choices; both can remain selected together. Other
                labels appear as compact badges in the medication library, with
                an extra count when space is limited. Changing labels does not
                change quantities, times, notes, or dose calculations.
              </p>
            </GuideDetail>
            <GuideDetail title="Edits Apply To Past Logs" icon="retry">
              <p>
                Changing a medication’s name, strength, or type updates every
                linked past intake. A strength change recalculates its doses and
                daily totals from the quantities you actually logged.
              </p>
              <p>
                Recorded quantities, taken times, creation times, intake notes,
                and goal amounts stay as entered. Changing Default Quantity only
                changes the starting value for new intakes.
              </p>
            </GuideDetail>
            <GuideDetail title="A Familiar Color &amp; Symbol" icon="flower">
              <p>
                Browse with the Icons, Emojis and Customs count buttons, or
                search by name or keyword in English or German. A source opens
                its first 100 choices immediately. Load more reveals the next
                batch; press the active source again for mixed search. Typed
                results arrive after you stop for 2.5 seconds.
              </p>
              <p>
                Try <code>svg</code> for custom artwork, <code>outline</code>{" "}
                for tintable tablets, or <code>color</code> for flat-color
                tablet illustrations. Final Look shows the symbol and its actual
                journal card, with a clear default-dose breakdown. Try Surprise
                Me and Undo, or use the small motion button to pause the preview
                animations. Your motion choice is remembered with the draft.
              </p>
              <p>
                Tintable icons follow your chosen accent; colored artwork keeps
                its own colors. The app itself follows your device’s light or
                dark appearance and reduced-motion settings.
              </p>
            </GuideDetail>
            <GuideDetail title="Archive &amp; Restore" icon="archive">
              <p>
                Tap anywhere on a medication card to open its editor. Archive
                Medication is below the form when you no longer want it offered
                for new intakes; its earlier records stay in the journal. Use
                the Active/Archive toggle to find archived items, open their
                card, and choose Restore Medication whenever you need them
                again.
              </p>
            </GuideDetail>
          </div>
        </section>

        <section
          id="goals"
          className={styles.section}
          aria-labelledby="goals-title"
        >
          <SectionHeading
            id="goals"
            icon={<ActionIcon name="goals" className="size-[18px]" />}
            title="Goals &amp; Streaks"
            context="Two Different Views"
          />
          <div className={styles.panel}>
            <GuideDetail title="Goals Follow One Medication" icon="navGoals">
              <p>
                A goal is a daily maximum in mg for one medication, with a start
                date, optional end date, and optional note. Both dates are
                included. You can record future goals and a maximum of zero.
              </p>
              <p>
                When goals overlap, the latest start date takes over. When that
                newer goal ends, an older goal does not restart automatically.
                Add the next goal when you want another value to apply.
              </p>
              <p>
                The app shows comparisons with your own entries. It does not
                generate a reduction schedule or convert one medication into
                another.
              </p>
            </GuideDetail>
            <GuideDetail
              title="Streaks Count Days With Intake Records"
              icon="sparkle"
            >
              <p>
                The stars counter records consecutive tracking days with at
                least one saved intake. Several entries on a day still count as
                one day. If today is still empty, an uninterrupted run ending
                yesterday remains current.
              </p>
              <p>
                Use Explore Streak Milestones below to visit Streaks. It is no
                longer a navigation-menu item. Early milestones arrive in small
                steps, then every five days after 30.
              </p>
              <p>
                A streak measures logging activity. It does not indicate whether
                every intake was recorded or a daily goal was met. Morning and
                evening check-ins do not add intake days to the counter.
              </p>
              <p>
                The Streaks page shows the latest three unlocked milestones and
                the next three targets. Achievements stay unlocked after a gap.
                Each card opens its own page with the recorded days, check-in
                changes, and separate medication figures available for that
                milestone. Missing records stay unknown; dose changes are not
                labeled as better or worse.
              </p>
              <p>
                When a link includes a milestone spotlight, that milestone moves
                into view and briefly lights up. If it falls outside the usual
                list, an extra card appears under In The Spotlight. Its earned
                or upcoming status still comes from your saved records. Reduced
                motion uses a brief outline instead of the animated burst.
              </p>
              <PageLink href="/streaks">Explore Streak Milestones</PageLink>
            </GuideDetail>
          </div>
        </section>

        <section
          id="check-in"
          className={styles.section}
          aria-labelledby="check-in-title"
        >
          <SectionHeading
            id="check-in"
            icon={<MoonStarsIcon size={18} weight="bold" />}
            title="Morning & Evening Check-Ins"
            context="Two Moments, One Day"
          />
          <div className={styles.readingCard} data-card-entry>
            <p>
              Morning is available from the 06:00 tracking-day reset. Evening
              becomes available at 17:00 in your journal timezone and takes the
              first position above Today’s intakes. Morning then moves below the
              last intake until the next reset. Both check-ins sit alongside the
              intake cards with the same compact spacing. Morning focuses on
              your sleep and how you’re waking up; Evening keeps your day’s
              moods and reflections. Add at least one detail to save, including
              on a day without intakes.
            </p>
            <p>
              Both cards share a warm theme and a large sun or moon icon. After
              saving, the latest journal-update time appears before the title,
              just like an intake’s time. Saved entries or unfinished content
              show a larger percentage and colored ring at the right. A short
              hint beneath the title points to the next missing section; when
              complete, it reads “All sections added”. Local edits update this
              progress without changing the saved journal time. Untouched cards
              keep the simpler prompt. Tap the whole card to open your
              reflection.
            </p>
            <p>
              <strong>Morning sleep journal.</strong> Rate dream recall,
              sleepiness, depth, restfulness and overall quality from 1 to 10.
              Then add lights-out/getting-up times, time to fall asleep and any
              night awakenings. Record actual sleep and extra sleep wanted in
              hours and minutes; the form calculates estimated time in bed and
              the percentage spent asleep. Leave anything unknown blank, or
              enter 0 for none. The five completion groups are Notes, Sleep
              Ratings, Sleep Schedule, Night Interruptions and Sleep Duration.
            </p>
            <p>
              <strong>Evening reflection.</strong> Keep the familiar fields
              below: moods, Energy/Stress, sleep hours, What Helped and your
              journal.
            </p>
            <div
              className={styles.moodList}
              aria-label="Available Check-In Moods"
            >
              {DAILY_MOODS.map((mood) => (
                <span key={mood.value}>
                  <span aria-hidden="true">{mood.emoji}</span>
                  {mood.label}
                </span>
              ))}
            </div>
            <dl className={styles.reference}>
              <div>
                <dt
                  id={guideHeadingId("guide-checkin", "Your Day, Your Words")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Your Day, Your Words"}
                >
                  Your Day, Your Words
                </dt>
                <dd>
                  A roomy journal entry, up to{" "}
                  {DAILY_REFLECTION_MAX_LENGTH.toLocaleString("en-GB")}{" "}
                  characters. Keep paragraphs and follow the live word and
                  character counts. Morning calls this Your Morning, Your Words;
                  both open the same Markdown writing space, without prompts.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("guide-checkin", "Journal Links")}
                  data-guide-outline-level="2"
                  data-guide-outline-label="Journal Links"
                >
                  Link a little context
                </dt>
                <dd>
                  <p>
                    Use <code>@</code> for a medication, active ingredient or
                    category such as Benzodiazepine. Use <code>/</code> for a
                    day, week or journal: try <code>/Today</code>,{" "}
                    <code>/Yesterday</code>, <code>/9Nov</code> or{" "}
                    <code>/ThisWeek</code>. Suggestions appear after 0.8 seconds
                    without typing, using only the journal already on your
                    device. Typing a space closes the suggestions so you can
                    continue normally.
                  </p>
                  <p className="mt-2">
                    Choose the main row to link a medication or whole day. Its
                    separate arrow reveals today’s logged intakes or that day’s
                    saved Morning/Evening journals. Up/Down moves through
                    choices, Right opens the extra choices, Left returns, and
                    Enter or Tab inserts. Escape closes just the suggestions.
                    You can also type an exact name or a reference such as{" "}
                    <code>/Yesterday.Evening</code> directly.
                  </p>
                  <p className="mt-2">
                    Preview and Read turn these into small, colored links. An
                    intake link reveals and highlights its actual log card; a
                    medication link highlights its library card. Ingredients
                    open the most-used matching medication, categories gather
                    their saved medications, and weeks gather their recorded
                    days. A direct journal link can read even a short note; the
                    main Journal collection still needs more than 100 words.
                    Selected dates stay fixed, and relative references typed in
                    older writing stay anchored to that entry’s day.
                  </p>
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("guide-checkin", "Moods")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Moods"}
                >
                  Moods
                </dt>
                <dd>Choose up to four. A mixed day is welcome.</dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("guide-checkin", "Energy & Stress")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Energy & Stress"}
                >
                  Energy &amp; Stress
                </dt>
                <dd>
                  Optional 1–5 ratings. Tap a selected number again to clear it.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("guide-checkin", "Sleep")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Sleep"}
                >
                  Sleep
                </dt>
                <dd>
                  Hours slept last night, including zero or a fractional amount.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("guide-checkin", "What Helped")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"What Helped"}
                >
                  What Helped
                </dt>
                <dd>
                  A small reminder of something useful, up to 160 characters.
                </dd>
              </div>
            </dl>
            <p>
              The card keeps your check-in close without showing your private
              responses. A check mark confirms it was saved; the small section
              count shows how much you added. Unsaved changes stay in your local
              draft. Tap anywhere on either card to continue or edit. Morning
              and Evening each have one record per tracking day, with their own
              logging time and device-local draft. Saving or resetting one
              leaves the other alone; edits update only the selected entry.
            </p>
            <p>
              The evening continues after midnight until 06:00. An open draft
              keeps the day it was opened for, even if the clock passes the
              reset. On past-day pages, Morning sits above the intakes and
              Evening below them. Those pages let you add either missed check-in
              at any hour. Earlier entries remain Evening Check-Ins; adding
              Morning does not move or replace them.
            </p>
          </div>
        </section>

        <section
          id="history"
          className={styles.section}
          aria-labelledby="history-title"
        >
          <SectionHeading
            id="history"
            icon={<ActionIcon name="history" className="size-[18px]" />}
            title="History &amp; Backups"
            context="Keep The Detail"
          />
          <div className={styles.readingCard} data-card-entry>
            <p>
              Past Days lists days with intake records or either check-in,
              newest first. It starts with the latest 20;{" "}
              <strong>Load More</strong> reveals another 20. A check-in-only day
              stays accessible even when there were no intake entries.
            </p>
            <p>
              Open a day for its timeline, medication totals, recorded goals,
              and check-in. Previous Day and Next Day help you move between
              dates; Add Missed Intake lets you catch up on an earlier record.
            </p>
            <div className={styles.callout}>
              <ActionIcon name="export" className="size-4" />
              <p>
                <strong>Export Journal</strong> is at the bottom of Past Days.
                It downloads a JSON backup of medications, intakes, goals,
                check-ins, and settings. Keep that file somewhere you can find
                it again.
              </p>
            </div>
            <PageLink href="/history">Open Past Days</PageLink>
          </div>
        </section>

        <section
          id="app"
          className={styles.section}
          aria-labelledby="app-title"
        >
          <SectionHeading
            id="app"
            icon={<DeviceMobileIcon size={18} weight="bold" />}
            title="Your App, Your Device"
            context="A Few Useful Habits"
          />
          <div className={styles.panel}>
            <GuideDetail title="Install On Your Home Screen" icon="export" open>
              <p>
                Open{" "}
                <a href="https://pill-happens.vercel.app/">
                  pill-happens.vercel.app
                </a>{" "}
                and choose Install App in navigation. Supported browsers offer
                their install prompt; otherwise the app shows instructions for
                your device. On iPhone or iPad, these guide you through Safari’s
                Share → Add to Home Screen action.
              </p>
              <p>
                Install from the stable address above so your shortcut keeps
                receiving updates. A shortcut made from a long preview address
                keeps opening that separate deployment.
              </p>
              <div className={styles.installAction}>
                <InstallAppButton />
              </div>
            </GuideDetail>
            <GuideDetail title="A Place For Everything" icon="menu">
              <p>
                Open the menu beside the animated tablets to move between Today,
                Past Days, Medications and Goals. The page you’re on is
                highlighted; small counts show what is already in your journal.
                Getting Started Guide sits below the main pages. Developer Guide
                is a small link in the footer beside Backups &amp; Export;
                installation is available from the menu’s top icon row. On
                smaller screens, scroll the list to find every page.
              </p>
            </GuideDetail>
            <GuideDetail title="Find Your Light" icon="palette">
              <p>
                The theme button beside Close in the menu opens Appearance.
                Choose Light &amp; Bright, Dark &amp; Cozy or Follow Your
                Device. Your choice applies across the app and stays in this
                browser when storage is available. System follows your device
                automatically; a manual choice stays as you set it. If the
                browser cannot save it, This Visit Only means it will last for
                the current visit. Your journal entries and saved medication
                colors stay the same.
              </p>
            </GuideDetail>
            <GuideDetail title="Refresh Or Open Medications" icon="retry">
              <p>
                Tap the animated tablets to the left of the menu to refresh this
                page. Or pull that button downward: its pills fade beneath a
                warm berry surface and a refresh icon grows in their place. When
                the button and icon rebound to full size, release to refresh. A
                short pull cancels. One continuous loading screen stays in place
                while the page reloads, your journal returns and the app
                restores your drafts and position.
              </p>
              <p>
                Pull the same button to the right until it rebounds, then
                release to open Medications. This keeps your unfinished drafts
                and uses in-app navigation. If Medications is already open, the
                button settles back without navigating or changing your scroll
                position. The menu’s <strong>Medications</strong> link is also
                available without a gesture.
              </p>
              <p>
                You can steer between down and right before the button is ready.
                Reaching that point locks the action; pulling back cancels it.
                Releasing a drag never triggers an extra refresh. Clicking or
                using the keyboard on the tablet button still refreshes this
                page. These actions are unavailable while a save is pending.
                Ordinary page scrolling stays separate from the branding
                gesture.
              </p>
            </GuideDetail>
            <GuideDetail title="Connection &amp; App Updates" icon="lightning">
              <p>
                Loading and saving journal records needs a connection. The
                installed app can show a neutral offline page, but it does not
                queue offline intakes or save them for later submission.
                Unfinished form drafts are separate: they stay on the device and
                still need your explicit Save when connected.
              </p>
              <p>
                When a new app version is waiting, App Update Ready offers
                Reload or Later. Choose Reload when you are finished with an
                open form. An update does not automatically reload the page
                while you are editing.
              </p>
            </GuideDetail>
            <GuideDetail
              title="Remembered Sign-In &amp; Password Journals"
              icon="secure"
            >
              <p>
                Your sign-in is remembered with a persistent cookie. Refreshing,
                closing, and reopening the app should normally keep you in the
                same journal when the browser retains its site data.
              </p>
              <p>
                A password opens the journal with that exact password, including
                its case and spaces. A different, unused password opens a
                confirmation to create a new empty journal. It does not rename
                or reset the previous one. The confirmation asks before creating
                anything.
              </p>
              <p>
                Safari and its Home Screen app can keep separate sign-in
                storage. Sign in inside the installed app when needed, using the
                same stable address and exact password.
              </p>
            </GuideDetail>
          </div>
          <div className={styles.privacyNote}>
            <ShieldCheckIcon size={17} weight="bold" aria-hidden="true" />
            <p>
              Sign out under <strong>Past Days → Preferences</strong>. Keep your
              journal password and exported backup for your own use. Anyone who
              knows the same exact journal password can open that journal.
            </p>
          </div>
        </section>

        <section
          id="questions"
          className={styles.section}
          aria-labelledby="questions-title"
        >
          <SectionHeading
            id="questions"
            icon={<QuestionIcon size={18} weight="bold" />}
            title="Quick Answers"
            context="When Something Looks Different"
          />
          <div className={styles.panel}>
            <GuideDetail title="Why Is Today Empty This Morning?">
              <p>
                Today changes at 06:00 in the journal timezone. Earlier entries
                are still in Past Days. Before 06:00, the app is still showing
                the previous tracking day.
              </p>
            </GuideDetail>
            <GuideDetail title="Why Did An Old Dose Or Total Change?">
              <p>
                Past intakes use their medication’s current name, type, and
                strength. Editing strength recalculates doses from the original
                quantities; it does not rewrite those quantities or taken times.
              </p>
            </GuideDetail>
            <GuideDetail title="How Do I Edit A Stacked Intake?">
              <p>
                Tap any visible card in a folded stack to open the whole group,
                then tap the intake you want to edit. Show Intakes and Fold
                Intakes open or close the same group. Its membership follows
                when entries were taken, rather than when you entered them.
              </p>
            </GuideDetail>
            <GuideDetail title="Can I Check In Without Logging An Intake?">
              <p>
                Yes. Morning and Evening Check-In are independent of the intake
                list. Saving one makes that day available in History, but does
                not add an intake or increase the logging streak.
              </p>
            </GuideDetail>
            <GuideDetail title="What If A Save Fails?">
              <p>
                Check the connection and retry when you are ready. Failed saves
                retain the current draft, including if you close the form and
                return later. The app does not automatically replay a save after
                restoring a sign-in.
              </p>
            </GuideDetail>
            <GuideDetail title="Why Am I Being Asked For A Password Again?">
              <p>
                Check that you opened the same stable address and the same
                browser or installed app. A preview address has its own sign-in.
                Signing out, clearing site data, or a browser removing stored
                cookies can also require signing in again.
              </p>
            </GuideDetail>
            <GuideDetail title="Can I Restore A JSON Backup In The App?">
              <p>
                The current interface downloads backups; it does not have an
                import or restore screen. Export is useful for keeping a
                readable copy of your records outside the app.
              </p>
            </GuideDetail>
            <GuideDetail title="Where Do I Change The Timezone Or Sign Out?">
              <p>
                Open Past Days and scroll to Preferences at the bottom. The
                timezone controls the date, clock, tracking-day boundary,
                check-in prompts, and intake grouping by day.
              </p>
            </GuideDetail>
          </div>
        </section>
      </GuideOutline>

      <footer className={styles.footer}>
        <GuideStartLink className={styles.returnAction}>
          <ActionIcon name="today" className="size-4" />
          Back To Today
          <ActionIcon name="next" className="size-4" />
        </GuideStartLink>
        <div className={styles.footerLinks}>
          <a href="#start" className={styles.topLink}>
            Back To The Steps
          </a>
          <span aria-hidden="true">·</span>
          <Link href="/developer-guide" className={styles.topLink}>
            Developer Guide
            <ActionIcon name="external" className="size-3" />
          </Link>
        </div>
      </footer>
    </article>
  );
}
