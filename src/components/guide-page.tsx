import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenTextIcon } from "@phosphor-icons/react/dist/ssr/BookOpenText";
import { MoonStarsIcon } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { RocketLaunchIcon } from "@phosphor-icons/react/dist/ssr/RocketLaunch";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { DeviceMobileIcon } from "@phosphor-icons/react/dist/ssr/DeviceMobile";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import { GuideColors } from "@/components/guide-colors";
import { HeadingText } from "@/components/heading-text";
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
  { id: "colors", label: "Colors" },
  { id: "history", label: "History & Backups" },
  { id: "app", label: "The App" },
  { id: "questions", label: "Quick Answers" },
] as const;

function SectionHeading({
  icon,
  title,
  context,
}: {
  icon: ReactNode;
  title: string;
  context: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <h2>
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
    <details className={styles.detail} open={open}>
      <summary>
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
  return (
    <Link href={href} className={styles.pageLink}>
      {children}
      <ActionIcon name="external" className="size-3.5" />
    </Link>
  );
}

export function GuidePage() {
  return (
    <article className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ActionIcon name="back" className="size-3.5" />
        Back To Today
      </Link>

      <header className={styles.intro}>
        <h1>
          <HeadingText
            title={
              <span className={styles.title}>
                <BookOpenTextIcon size={23} weight="bold" aria-hidden="true" />
                Guide
              </span>
            }
            context="Your Journal"
            className="items-center"
          />
        </h1>
        <p>
          Set up your medications, record your day, and keep a useful history.
          Start with the four steps below, or jump to whatever you need.
        </p>
        <div className={styles.atAGlance} aria-label="Journal At A Glance">
          <div>
            <span>06:00</span>
            <small>New Tracking Day</small>
          </div>
          <div>
            <span>20:30</span>
            <small>Evening Check-In</small>
          </div>
          <div>
            <span>Your Timezone</span>
            <small>Set In Preferences</small>
          </div>
        </div>
      </header>

      <nav className={styles.contents} aria-label="Guide Contents">
        {sections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>

      <section id="start" className={styles.section}>
        <SectionHeading
          icon={<RocketLaunchIcon size={18} weight="bold" />}
          title="Getting Started"
          context="Four Small Steps"
        />
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepNumber}>01</span>
            <div>
              <h3>Add Your Medication</h3>
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
          <li>
            <span className={styles.stepNumber}>02</span>
            <div>
              <h3>Record An Intake</h3>
              <p>
                On Today, tap <strong>Log an Intake</strong> or the empty entry
                card. Choose the medication and quantity, check the calculated
                mg, and save. Date &amp; Time Taken starts at the current time;
                change it when you are catching up on an earlier intake.
              </p>
              <PageLink href="/">Go To Today</PageLink>
            </div>
          </li>
          <li>
            <span className={styles.stepNumber}>03</span>
            <div>
              <h3>Add A Goal, If You Want One</h3>
              <p>
                Goals are daily maximums you enter for an individual medication.
                Choose the amount and dates that apply. The journal compares
                that medication’s recorded total with your chosen value.
              </p>
              <PageLink href="/goals">Open Goals</PageLink>
            </div>
          </li>
          <li>
            <span className={styles.stepNumber}>04</span>
            <div>
              <h3>Leave An Evening Check-In</h3>
              <p>
                From 20:30, a small button below the intake list opens your
                reflection. A few words or a single mood is enough. Once saved,
                its editable summary appears above that day’s intakes.
              </p>
              <a className={styles.pageLink} href="#check-in">
                See The Check-In Fields
                <ActionIcon name="loadMore" className="size-3.5" />
              </a>
            </div>
          </li>
        </ol>
      </section>

      <section id="daily-log" className={styles.section}>
        <SectionHeading
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
              intake at 05:59 belongs to the previous tracking day; one at 06:00
              belongs to the new day. Your old records stay in Past Days when
              Today changes over.
            </p>
            <p>
              Change the timezone under <strong>Past Days → Preferences</strong>
              . This regroups intakes by their saved times; it does not change
              the moments you recorded. The calendar handles daylight-saving
              changes, including shorter and longer days.
            </p>
          </GuideDetail>
          <GuideDetail title="Logging, Quantities &amp; Notes" icon="record">
            <p>
              Quantity means the number of tablets, capsules, drops, pumps, or
              other units you took. Fractions are supported. The displayed dose
              is the medication’s current strength per unit multiplied by the
              recorded quantity.
            </p>
            <div className={styles.example}>
              <span>For Example</span>
              <code>2 mg per unit × 0.5 units = 1 mg</code>
            </div>
            <p>
              Add an optional intake note for context. The default quantity is
              only a starting value: check the actual amount each time. Each
              medication keeps its own totals; amounts from different
              medications are not combined into one dose.
            </p>
          </GuideDetail>
          <GuideDetail title="Backdating &amp; Correcting Entries" icon="edit">
            <p>
              For an intake you forgot to record, change Date &amp; Time Taken
              before saving, or open its day in Past Days and choose
              <strong> Add Missed Intake</strong>. Check the time there too; a
              new entry opened from a past day starts at noon on that date.
            </p>
            <p>
              Tap an existing entry to edit its medication, quantity, time, or
              note. A time change immediately moves it into the appropriate day
              and stack. Deleting an intake has a separate confirmation. Future
              intake times cannot be saved.
            </p>
          </GuideDetail>
          <GuideDetail
            title="How The Stacks Work"
            context="Rolling 13-Minute Windows"
            icon="history"
          >
            <p>
              Entries appear from earliest to latest by Date &amp; Time Taken.
              Intakes form a compact stack when each is no more than 13 minutes
              after the previous one. Each intake extends the window by another
              13 minutes, even when you entered it later.
            </p>
            <div className={styles.example}>
              <span>A Quick Example</span>
              <p>
                08:00, 08:12, and 08:25 share a stack. An 08:39 intake starts a
                new one.
              </p>
            </div>
            <p>
              Tap a collapsed stack once to reveal its cards. Tap an individual
              revealed card again to edit it. Use <strong>Collapse</strong> to
              fold the group back up. The folded preview shows up to six cards
              behind the first; opening reveals every entry at full size.
            </p>
          </GuideDetail>
        </div>
      </section>

      <section id="medications" className={styles.section}>
        <SectionHeading
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
                <dt>Name</dt>
                <dd>The name you want to see throughout the journal.</dd>
              </div>
              <div>
                <dt>Active Ingredient</dt>
                <dd>
                  An optional Wirkstoff name; it can be left blank or cleared.
                </dd>
              </div>
              <div>
                <dt>Strength</dt>
                <dd>mg in one tablet, capsule, drop, pump, or chosen unit.</dd>
              </div>
              <div>
                <dt>Default Quantity</dt>
                <dd>
                  A prefilled amount for new intakes, which you can change
                  before saving.
                </dd>
              </div>
              <div>
                <dt>Medication Type</dt>
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
              The Categories menu sits beside Active Ingredient. Search the{" "}
              {MEDICATION_CATEGORIES.length} labels in English or German—for
              example, Sleep Aid or Schlafmittel—and select as many as you want.
              Each choice stays selected while you search for another. Remove
              individual labels or clear the selection to leave it empty.
            </p>
            <p>
              These optional labels help organize your own medication list. More
              than one can be selected for the same item; you choose which ones
              are useful. Medication Type still describes its form and counting
              unit. Names and active ingredients never select categories
              automatically. Categories can be left empty.
            </p>
            <p>
              Earlier Benzo and Opioid markings carry over. They keep their rose
              and amber priority markers across intakes, history, goals, and
              medication choices; both can remain selected together. Other
              labels appear as compact badges in the medication library, with an
              extra count when space is limited. Changing labels does not change
              quantities, times, notes, or dose calculations.
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
          <GuideDetail title="Archive &amp; Restore" icon="archive">
            <p>
              Archive a medication when you no longer want it offered for new
              intakes. Its earlier records stay in the journal. Use the
              Active/Archive toggle on Medications to find archived items and
              restore them whenever you need them again.
            </p>
          </GuideDetail>
        </div>
      </section>

      <section id="goals" className={styles.section}>
        <SectionHeading
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
              newer goal ends, an older goal does not restart automatically. Add
              the next goal when you want another value to apply.
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
              The stars counter records consecutive tracking days with at least
              one saved intake. Several entries on a day still count as one day.
              If today is still empty, an uninterrupted run ending yesterday
              remains current.
            </p>
            <p>
              Tap the top-right stars button for your current streak, best
              streak, total days logged, and next milestone. Early milestones
              arrive in small steps, then every five days after 30.
            </p>
            <p>
              A streak measures logging activity. It does not indicate whether
              every intake was recorded or a daily goal was met. Evening
              check-ins do not add intake days to the counter.
            </p>
            <p>
              Open Streaks from navigation to see the latest three unlocked
              milestones and the next three targets. Achievements stay unlocked
              after a gap. Each card opens its own page with the recorded days,
              check-in changes, and separate medication figures available for
              that milestone. Missing records stay unknown; dose changes are not
              labeled as better or worse.
            </p>
            <PageLink href="/streaks">Explore Streak Milestones</PageLink>
          </GuideDetail>
        </div>
      </section>

      <section id="check-in" className={styles.section}>
        <SectionHeading
          icon={<MoonStarsIcon size={18} weight="bold" />}
          title="Evening Check-Ins"
          context="From 20:30"
        />
        <div className={styles.readingCard}>
          <p>
            The check-in button appears below Today’s intake list from 20:30 in
            the journal timezone. Every field is optional; add at least one
            detail to save. A single mood is enough, and you can check in on a
            day with no recorded intakes.
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
              <dt>Your Day, Your Words</dt>
              <dd>
                A roomy journal entry, up to{" "}
                {DAILY_REFLECTION_MAX_LENGTH.toLocaleString("en-GB")}{" "}
                characters. Keep paragraphs and follow the live word and
                character counts. Optional prompts offer a starting point
                without changing your writing.
              </dd>
            </div>
            <div>
              <dt>Moods</dt>
              <dd>Choose up to four. A mixed day is welcome.</dd>
            </div>
            <div>
              <dt>Energy &amp; Stress</dt>
              <dd>
                Optional 1–5 ratings. Tap a selected number again to clear it.
              </dd>
            </div>
            <div>
              <dt>Sleep</dt>
              <dd>
                Hours slept last night, including zero or a fractional amount.
              </dd>
            </div>
            <div>
              <dt>What Helped</dt>
              <dd>
                A small reminder of something useful, up to 160 characters.
              </dd>
            </div>
          </dl>
          <p>
            After saving, the filled summary moves above that day’s intakes. Tap
            it to edit. There is one check-in per tracking day, and edits update
            that record rather than adding another.
          </p>
          <p>
            The evening continues after midnight until 06:00. An open draft
            keeps the day it was opened for, even if the clock passes the reset.
            Past logs also let you add a missed check-in at any hour.
          </p>
        </div>
      </section>

      <section id="colors" className={styles.section}>
        <SectionHeading
          icon={<PaletteIcon size={18} weight="bold" />}
          title="Colors &amp; Appearance"
          context="Palette, Roles & Copy"
        />
        <p className={styles.sectionIntro}>
          Peach, Flame, Rust, Ink and Violet shape the whole interface. Explore
          their roles in light and dark mode, inspect exact values, or copy the
          complete theme. Your saved medication colors have their own palette
          below.
        </p>
        <GuideColors />
        <div className={styles.panel}>
          <GuideDetail title="Make Each Medication Recognizable" icon="log">
            <p>
              In Appearance, search for a symbol by name or keyword, or paste an
              emoji. Results mix Lucide icons, the project’s SVG artwork, and
              emoji. English and German search terms are supported. Search
              results arrive after you stop typing for 2.5 seconds.
            </p>
            <p>
              Try <code>svg</code> for custom artwork, <code>outline</code> for
              tintable tablets, or <code>color</code> for the flat-color tablet
              illustrations. Tintable icons follow your selected accent; colored
              illustrations keep their own artwork colors.
            </p>
            <p>
              The Final Look card previews your choices before saving. Rotate
              the glyph in 45° steps, try Surprise Me for a new color and
              symbol, or Undo the last surprise. Rotation changes the glyph
              while its background stays upright.
            </p>
          </GuideDetail>
          <GuideDetail title="Light, Dark &amp; Motion" icon="flower">
            <p>
              The app follows your device’s light or dark appearance. There is
              no separate theme switch. Both modes keep the same medication
              accents, while page surfaces, contrast, and the background adapt.
            </p>
            <p>
              Reduced-motion settings quiet decorative movement. Hover effects
              are limited to larger screens with a precise pointer; mobile
              controls do not depend on hovering.
            </p>
          </GuideDetail>
        </div>
      </section>

      <section id="history" className={styles.section}>
        <SectionHeading
          icon={<ActionIcon name="history" className="size-[18px]" />}
          title="History &amp; Backups"
          context="Keep The Detail"
        />
        <div className={styles.readingCard}>
          <p>
            Past Days lists days with intake records or evening check-ins,
            newest first. It starts with the latest 20;{" "}
            <strong>Load More</strong> reveals another 20. A check-in-only day
            stays accessible even when there were no intake entries.
          </p>
          <p>
            Open a day for its timeline, medication totals, recorded goals, and
            check-in. Previous Day and Next Day help you move between dates; Add
            Missed Intake lets you catch up on an earlier record.
          </p>
          <div className={styles.callout}>
            <ActionIcon name="export" className="size-4" />
            <p>
              <strong>Export Journal</strong> is at the bottom of Past Days. It
              downloads a JSON backup of medications, intakes, goals, check-ins,
              and settings. Keep that file somewhere you can find it again.
            </p>
          </div>
          <PageLink href="/history">Open Past Days</PageLink>
        </div>
      </section>

      <section id="app" className={styles.section}>
        <SectionHeading
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
          <GuideDetail title="Pull The Brand To Refresh" icon="retry">
            <p>
              Pull the pill happens brand downward until the badge says
              <strong> Release To Refresh</strong>, then release. A loading
              screen appears while the current page fully reloads and the
              journal loads again. A short pull cancels, and an ordinary tap on
              the brand still goes home.
            </p>
            <p>
              You can also choose <strong>Refresh Page</strong> from navigation.
              Refresh is unavailable while a save is pending. Ordinary page
              scrolling stays separate from the branding gesture.
            </p>
          </GuideDetail>
          <GuideDetail title="Connection &amp; App Updates" icon="lightning">
            <p>
              Loading and saving journal records needs a connection. The
              installed app can show a neutral offline page, but it does not
              queue offline intakes or save them for later submission.
            </p>
            <p>
              When a new app version is waiting, App Update Ready offers Reload
              or Later. Choose Reload when you are finished with an open form.
              An update does not automatically reload the page while you are
              editing.
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
              confirmation to create a new empty journal. It does not rename or
              reset the previous one. The confirmation asks before creating
              anything.
            </p>
            <p>
              Safari and its Home Screen app can keep separate sign-in storage.
              Sign in inside the installed app when needed, using the same
              stable address and exact password.
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

      <section id="questions" className={styles.section}>
        <SectionHeading
          icon={<QuestionIcon size={18} weight="bold" />}
          title="Quick Answers"
          context="When Something Looks Different"
        />
        <div className={styles.panel}>
          <GuideDetail title="Why Is Today Empty This Morning?">
            <p>
              Today changes at 06:00 in the journal timezone. Earlier entries
              are still in Past Days. Before 06:00, the app is still showing the
              previous tracking day.
            </p>
          </GuideDetail>
          <GuideDetail title="Why Did An Old Dose Or Total Change?">
            <p>
              Past intakes use their medication’s current name, type, and
              strength. Editing strength recalculates doses from the original
              quantities; it does not rewrite those quantities or taken times.
            </p>
          </GuideDetail>
          <GuideDetail title="Why Can’t I Edit A Collapsed Card Yet?">
            <p>
              The first tap opens the stack. The next tap on a revealed entry
              opens its editor. Entries group by when they were taken, rather
              than when you entered them.
            </p>
          </GuideDetail>
          <GuideDetail title="Can I Check In Without Logging An Intake?">
            <p>
              Yes. The evening check-in is independent of the intake list.
              Saving one makes that day available in History, but does not add
              an intake or increase the logging streak.
            </p>
          </GuideDetail>
          <GuideDetail title="What If A Save Fails?">
            <p>
              Leave the form open, check the connection, and retry when you are
              ready. Failed saves retain the current draft. The app does not
              automatically replay a save after restoring a sign-in.
            </p>
          </GuideDetail>
          <GuideDetail title="Why Am I Being Asked For A Password Again?">
            <p>
              Check that you opened the same stable address and the same browser
              or installed app. A preview address has its own sign-in. Signing
              out, clearing site data, or a browser removing stored cookies can
              also require signing in again.
            </p>
          </GuideDetail>
          <GuideDetail title="Can I Restore A JSON Backup In The App?">
            <p>
              The current interface downloads backups; it does not have an
              import or restore screen. Export is useful for keeping a readable
              copy of your records outside the app.
            </p>
          </GuideDetail>
          <GuideDetail title="Where Do I Change The Timezone Or Sign Out?">
            <p>
              Open Past Days and scroll to Preferences at the bottom. The
              timezone controls the date, clock, tracking-day boundary, evening
              prompt, and intake grouping by day.
            </p>
          </GuideDetail>
        </div>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.returnAction}>
          <ActionIcon name="today" className="size-4" />
          Back To Today
          <ActionIcon name="next" className="size-4" />
        </Link>
        <a href="#start" className={styles.topLink}>
          Back To The Steps
        </a>
      </footer>
    </article>
  );
}
