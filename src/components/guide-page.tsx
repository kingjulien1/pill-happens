import { DAILY_JOURNAL_MAX_LENGTH } from "@/lib/daily-journal";
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
import { DailyMoodIcon } from "@/components/daily-mood-icon";
import {
  DAILY_MOOD_CHOICES,
} from "@/lib/daily-check-in";
import { MEDICATION_CATEGORIES } from "@/lib/medication-categories";
import styles from "./guide-page.module.css";
import { Button } from "@/components/ui/button";

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
        data-has-icon={icon ? "" : undefined}
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
    <Button
      navigation
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={<GuideStartLink />}
      className={`${styles.pageLink} h-auto p-0`}
    >
      {content}
    </Button>
  ) : (
    <Button
      navigation
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={<Link href={href} />}
      className={`${styles.pageLink} h-auto p-0`}
    >
      {content}
    </Button>
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
          <h1>Getting Started</h1>
          <p>
            Add your medications, record what you took, and leave a check-in
            when you want to. Start with the four steps below, or jump to the
            detail you need. You can open Today at any point and return here
            from the menu.
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

        <details className={styles.contentsBox} data-guide-inline-contents>
          <summary>
            <ActionIcon name="discover" className="size-4" />
            <strong>On This Page</strong>
            <span>{sections.length} sections</span>
            <ActionIcon name="expand" className="size-3.5" />
          </summary>
          <nav className={styles.contents} aria-label="Guide Contents">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.label}
              </a>
            ))}
          </nav>
        </details>

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
                  Open Medications and choose <strong>Add Medication</strong>.
                  Enter its name, strength in mg per unit, type, and default
                  quantity. Active Ingredient and Categories are optional.
                  Choose a color and symbol, check Final Look, then save.
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
                  On Today, tap <strong>Log Intake</strong>. Choose the
                  medication, actual quantity and intake route. Check the
                  calculated mg and Date &amp; Time Taken, then save. Change the
                  time first when recording an earlier intake.
                  Hold Time Lock until the ring fills, then release to keep
                  the displayed date and time across new and edited intakes.
                  Choose <strong>Show lock gesture</strong> inside Timing to
                  highlight the clock. Once locked, tap the clock to unlock or
                  hold and release to lock the current time.
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
                  A goal compares one medication’s recorded daily total with a
                  maximum you enter. Choose its amount and dates. Goals are
                  optional; you can start logging without one.
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
                  Tap either card to add sleep details, writing, moods or
                  ratings. Every field is optional; one detail is enough.
                  Writing saves separately as you work. Use Save Check-In for
                  the rest of your answers.
                </p>
                <Button
                  navigation
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<a href="#check-in" />}
                  className={`${styles.pageLink} h-auto p-0`}
                >
                  See The Check-In Fields
                  <ActionIcon name="loadMore" className="size-3.5" />
                </Button>
              </div>
            </li>
          </ol>
          <div className={styles.checklist}>
            <h3>Before Your First Intake Save</h3>
            <ul>
              <li>Confirm the medication’s strength is mg per one unit.</li>
              <li>
                Check the quantity you actually took and its calculated mg.
              </li>
              <li>Check the taken date, time and journal timezone.</li>
            </ul>
            <PageLink href="/history">Find Preferences In Past Days</PageLink>
          </div>
        </section>

        <aside
          className={styles.startAction}
          aria-label="Start Your Daily Log"
          data-card-entry
        >
          <Button
            navigation
            variant="default"
            size="lg"
            nativeButton={false}
            render={<GuideStartLink />}
            className={`${styles.quickStart} h-auto p-0`}
          >
            <ActionIcon name="shootingStar" className="size-[18px]" />
            Open My Daily Log
            <ActionIcon name="next" className="size-[18px]" />
          </Button>
          <p>
            Start now and return to this guide anytime. On a phone, use Contents
            to find a topic while you read.
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
                Every recorded time follows your journal’s timezone. An intake
                at 05:59 belongs to the previous tracking day; one at 06:00
                belongs to the new day. Your old records stay in Past Days when
                Today changes over.
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
                On the saved card, route and medication-form symbols sit beside
                the category icons. The artwork’s small <strong>× n</strong>
                label shows your full quantity when it differs from one; the
                decorative icon fan stops at three without changing that amount.
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
                Intake, medication, goal, check-in and preference forms keep
                drafts on this device when browser storage is available. Reopen
                the app to return to your last screen and form. Each medication,
                tracking day and check-in period keeps its own draft.
              </p>
              <p>
                Draft Saved means the form is kept locally. Save records the
                change in your journal; Reset Draft starts the form over.
                Closing an intake form does not record an intake. Drafts do not
                sync to other devices, and clearing site data removes them.
              </p>
              <p>
                <strong>Journal writing has its own save status.</strong> It
                saves automatically while connected and offers a Save action.
                Done closes the writing space. Use Save Check-In to save moods,
                ratings and other answers. If a restored draft or a change from
                elsewhere needs review, check your writing and use Save to keep
                that version.
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
                intake. Each intake remains a separate record.
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
          <p className={styles.sectionIntro}>
            Add Medication stays within reach at the bottom of your phone,
            using the same action as your daily log. Saved medication cards
            show your default quantity, strength and ingredient. On Today,
            tap a medication’s main icon to open its details; tap the rest of
            an entry to edit that intake. Reveal a folded group first.
          </p>
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
                {MEDICATION_CATEGORIES.length} optional labels. Scroll to browse
                or type a label with your keyboard to jump to it. Select
                several, choose Done, or use Clear to remove them all. Tap a
                selected label again to remove only that one.
              </p>
              <p>
                Choose the labels useful to you. Names and ingredients never
                select categories automatically. Medication Type still describes
                the form and counting unit; Categories can stay empty.
              </p>
              <p>
                Earlier Benzo and Opioid markings carry over. Their symbols
                follow your labels across intake cards, history and goals.
                Changing labels leaves quantities, times, notes and calculated
                doses as recorded.
              </p>
            </GuideDetail>
            <GuideDetail title="Edits Apply To Past Logs" icon="retry">
              <p>
                Changing a medication’s name, strength, or type updates every
                linked past intake. A strength change recalculates its doses and
                daily totals from the quantities you logged. Check the new
                strength carefully before saving.
              </p>
              <p>
                Recorded quantities, taken times, creation times, intake notes,
                and goal amounts stay as entered. Changing Default Quantity only
                changes the starting value for new intakes.
              </p>
            </GuideDetail>
            <GuideDetail title="A Familiar Color &amp; Symbol" icon="flower">
              <p>
                Choose Icons, Emojis or Customs to browse, or search by name or
                keyword in English or German. Each source opens its first 100
                choices; Load More reveals another batch. Tap the active source
                again to search all sources. Typed results appear after a
                2.5-second pause.
              </p>
              <p>
                Try <code>svg</code> for custom artwork, <code>outline</code>{" "}
                for tintable tablets, or <code>color</code> for flat-color
                tablet illustrations. Final Look previews the journal card and
                default-dose calculation. Surprise Me has its own Undo. The
                motion button pauses the preview and remembers that choice in
                this draft.
              </p>
              <p>
                Tintable icons follow your chosen accent; colored artwork keeps
                its own colors. Preview motion respects your device’s
                reduced-motion setting. Choose the app’s appearance from the
                menu.
              </p>
            </GuideDetail>
            <GuideDetail title="Archive &amp; Restore" icon="archive">
              <p>
                Open a medication card and choose Archive Medication to stop
                offering it for new intakes. Earlier records stay in the
                journal. To bring it back, open its card in the Archived group
                and choose Restore Medication.
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
                Open Explore Streak Milestones below. Early milestones arrive in
                small steps, then every five days after 30.
              </p>
              <p>
                A streak measures logging activity. It does not indicate whether
                every intake was recorded or a daily goal was met. Morning and
                evening check-ins do not add intake days to the counter.
              </p>
              <p>
                Streaks shows the latest three unlocked milestones and the next
                three targets. Achievements stay unlocked after a gap. Open a
                card for its recorded days, check-in changes and separate
                medication figures. Missing records remain unknown.
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
              Morning opens at the 06:00 reset. Evening opens at 17:00 in your
              journal timezone and continues until the next 06:00 reset. You can
              save either on a day with no intakes. Add one detail or several;
              every field is optional.
            </p>
            <p>
              Tap the cup or moon card to start, continue or edit. Morning sits
              above the day’s intakes; Evening stays below them. The completion
              indicator shows how many sections contain something, including
              draft answers. Opening the card alone does not complete a section.
            </p>
            <p>
              <strong>Morning sleep journal.</strong> Rate dream recall,
              sleepiness, depth, restfulness and overall quality from 1 to 10.
              Add Went to Bed, Woke Up, Asleep After and Awake, then the Light,
              Dream and Deep sleep durations. You can also paste or choose a
              Sleep Cycle report image and review its readings before applying
              them. The form calculates time in bed and the percentage spent
              asleep. Leave unknown details blank; use 0 for a recorded zero.
            </p>
            <p>
              <strong>Evening reflection.</strong> Browse{" "}
              {DAILY_MOOD_CHOICES.length} feelings with Lucide symbols. Search
              by word and pick every feeling that fits. Shuffle remixes choices
              used equally often. Selected feelings stay below the palette while
              you search. Add optional Energy and Stress ratings, then note what
              helped in Worth a Repeat.
            </p>
            <div
              className={styles.moodList}
              aria-label="Available Check-In Moods"
            >
              {DAILY_MOOD_CHOICES.slice(0, 10).map((mood) => (
                <span key={mood.value}>
                  <DailyMoodIcon mood={mood.value} size={14} />
                  {mood.label}
                </span>
              ))}
            </div>
            <dl className={styles.reference}>
              <div>
                <dt
                  id={guideHeadingId("guide-checkin", "Your Day, Your Words")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Daily Journal"}
                >
                  Daily Journal
                </dt>
                <dd>
                  A roomy journal entry, up to{" "}
                  {DAILY_JOURNAL_MAX_LENGTH.toLocaleString("en-GB")}{" "}
                  characters. Morning and Evening open the same daily page and draft with Markdown formatting, Preview, Read
                  and a Markdown download. Watch the writing save status; Done
                  returns to the check-in.
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
                    <code>/Yesterday</code> or <code>/ThisWeek</code>.
                    Suggestions appear after a brief pause using journal data
                    already loaded on this device. A space closes them.
                  </p>
                  <p className="mt-2">
                    Choose the main row to link a medication or whole day. Its
                    arrow reveals today’s intakes or that day’s saved journals.
                    On a keyboard, use Up/Down to browse, Right/Left to open or
                    leave extra choices, Enter/Tab to insert and Escape to
                    close. You can also type <code>/Yesterday.Evening</code>{" "}
                    directly.
                  </p>
                  <p className="mt-2">
                    Preview and Read make references into links to the related
                    card, day or saved writing. Selected dates stay fixed.
                    Relative references in older writing stay anchored to that
                    entry’s tracking day.
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
                <dd>
                  Search or scroll the compact library to choose what fits.
                  Selected feelings stay within reach and can be removed with
                  another tap. A mixed day is welcome.
                </dd>
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
                  Optional 1–10 sliders with a Clear action. Older five-point
                  answers keep their original scale until you change them.
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
                  Write down the things that helped, one per line if you like. There is room for 800 characters.
                </dd>
              </div>
            </dl>
            <p>
              <strong>Find longer writing in Journal.</strong> Saved entries
              with more than 100 words appear there automatically, with search
              and a reading view. Shorter saved notes stay in their check-in and
              can still open through a direct journal link. Unfinished writing is available from either check-in.
            </p>
            <PageLink href="/journal">Browse Journal Pages</PageLink>
            <p>
              Morning and Evening each have one saved record per tracking day
              for sleep, feelings and reminders. Writing has one shared draft and saved page. An
              open draft keeps its original day across the 06:00 reset. In Past
              Days, add either missed check-in at any hour: Morning sits above
              the intakes and Evening below them.
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
              Past Days gathers recorded days into weeks, newest first. It
              starts with at least the latest 20 recorded days, including the
              complete last week. <strong>Load More Weeks</strong> extends that
              budget by another 20. Tap a folded week to reveal its days, then
              open a day’s card. Check-in-only days stay in your history too.
            </p>
            <p>
              Open a day for its intake timeline and check-ins. Previous Day and
              Next Day move between dates; Add Missed Intake lets you catch up.
              The latest three recorded past days use live summaries. Older
              summaries are cached on this device, separately for each journal;
              relevant edits refresh them. These summaries are not a backup.
            </p>
            <div className={styles.callout}>
              <ActionIcon name="export" className="size-4" />
              <p>
                <strong>Export Journal</strong> is at the bottom of Past Days.
                It downloads a JSON backup of medications, intakes, goals,
                check-ins and settings. Local form drafts are not included. Keep
                the file somewhere you can find it again. The app currently has
                no import or restore screen.
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
                and use the Install App button below. Supported browsers offer
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
                Open the Journal index beside the animated tablets. The amber
                Today card shows the tracking date, logged intakes and saved
                check-ins. Open it to return to your day. The Library links take
                you to Journal, Past Days, Medications and Goals. Under Help
                &amp; tools you can find Getting started, Backups &amp; export,
                Report a bug and the Developer guide.
              </p>
            </GuideDetail>
            <GuideDetail title="Find Your Light" icon="palette">
              <p>
                Open Appearance with the theme button beside Close in the menu.
                Choose Light &amp; Bright, Dark &amp; Cozy or Follow Your
                Device. Your choice stays in this browser when storage is
                available. This Visit Only means it could not be saved for next
                time. The app also respects your device’s reduced-motion
                setting.
              </p>
            </GuideDetail>
            <GuideDetail title="Refresh Or Open Medications" icon="retry">
              <p>
                Tap the animated tablets, or activate them with the keyboard, to
                return to Today. Pull the button downward until it rebounds,
                then release to refresh the page. A short pull cancels. After
                the reload, the app restores your local drafts and position.
              </p>
              <p>
                Pull the same button to the right until it rebounds, then
                release to open Medications. Pull back before releasing to
                cancel. The menu also links to Medications. These actions wait
                while a save is pending.
              </p>
            </GuideDetail>
            <GuideDetail title="Saved Notices &amp; Undo" icon="restore">
              <p>
                A notice confirms a save or explains an error. Tap its heading
                to read the details, view the affected record and follow any
                related links. If several notices are stacked, the first tap
                reveals the stack. Reading pauses the notice’s display timer.
              </p>
              <p>
                When Undo is available, it reverses that saved change after the
                server confirms it. Dismissing a notice keeps the saved change.
                Undo is limited to 15 minutes after the change and can be
                refused if the record has changed again. Expanding a notice
                pauses its display timer, not the Undo deadline.
              </p>
              <p>
                Eligible notices and their remaining display time can return
                after reopening this journal on the same device. They are kept
                separately for each journal. Use the saved record itself when a
                notice or Undo is no longer available.
              </p>
            </GuideDetail>
            <GuideDetail title="Connection &amp; App Updates" icon="lightning">
              <p>
                Loading and saving records needs a connection. The installed app
                can show an offline page; intakes and other forms are not queued
                for later submission. Their local drafts wait for Save. Writing
                is different: it keeps a local draft and can resume its own
                saving when the connection returns. Check its save status.
              </p>
              <p>
                When a new app version is waiting, App Update Ready offers Apply
                Now or Update Later. Apply Now reloads after you finish an open
                form; Update Later stages the switch for the next time the app
                closes or reloads. Neither choice removes journal records.
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
                Check the connection and keep the draft. For intakes and other
                forms, reopen and save again when ready; the app does not replay
                that submission for you. Writing has a separate status and Save
                action. Review any restored-version or conflict message before
                choosing to save your writing.
              </p>
            </GuideDetail>
            <GuideDetail title="Why Is My Writing Missing From Journal?">
              <p>
                Journal gathers saved writing with more than 100 words. Exactly
                100 words, shorter notes and unfinished drafts stay with their
                Morning or Evening Check-In. Check the writing’s save status,
                then reopen the original day and check-in to find it.
              </p>
              <PageLink href="/journal">Open Journal</PageLink>
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
        <Button
          navigation
          variant="default"
          size="lg"
          nativeButton={false}
          render={<GuideStartLink />}
          className={`${styles.returnAction} h-auto p-0`}
        >
          <ActionIcon name="today" className="size-4" />
          Back To Today
          <ActionIcon name="next" className="size-4" />
        </Button>
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
