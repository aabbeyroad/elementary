"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { DAY_LABELS, PARENT_OPTIONS, STORAGE_KEY, sampleChildren, sampleSchedule } from "@/lib/demo-data";
import { buildGapAlerts, formatDuration, getTodayIndex, itemSort, toMinutes } from "@/lib/schedule";
import { ChildProfile, HouseholdBundle, HouseholdSummary, ParentRole, ScheduleItem, ScheduleType } from "@/lib/types";
import { hasValidTimeRange, normalizeAccessCode } from "@/lib/validation";
import styles from "./page.module.css";

type NewItemForm = Omit<ScheduleItem, "id">;
type NewChildForm = Omit<ChildProfile, "id">;

type StoredState = {
  household: HouseholdSummary | null;
  children: ChildProfile[];
  schedule: ScheduleItem[];
};

type ConfirmState = {
  eyebrow?: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
};

const TAB_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "kids", label: "Child setup" },
] as const;

type ActiveTab = (typeof TAB_OPTIONS)[number]["id"];

const defaultScheduleForm: NewItemForm = {
  childId: sampleChildren[0].id,
  dayOfWeek: 0,
  title: "",
  type: "academy",
  start: "15:00",
  end: "16:00",
  location: "",
  pickupOwner: "TBD",
  notes: "",
  packingList: "",
};

const defaultChildForm: NewChildForm = {
  name: "",
  grade: "1st grade",
  school: "",
  defaultDismissal: "13:10",
};

function resolveScheduleChildId(children: ChildProfile[], preferredChildId?: string) {
  if (preferredChildId && children.some((child) => child.id === preferredChildId)) {
    return preferredChildId;
  }

  return children[0]?.id ?? "";
}

function readStoredState() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StoredState>;

    return {
      household: parsed.household ?? null,
      children: Array.isArray(parsed.children) ? parsed.children : sampleChildren,
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule : sampleSchedule,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function formatSyncTime(value?: string) {
  if (!value) {
    return "Not synced yet";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Home() {
  const [household, setHousehold] = useState<HouseholdSummary | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>(sampleChildren);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(sampleSchedule);
  const [activeTab, setActiveTab] = useState<ActiveTab>("today");
  const [selectedDay, setSelectedDay] = useState(0);
  const [backendReady, setBackendReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Checking shared storage...");
  const [isWorking, setIsWorking] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<NewItemForm>(defaultScheduleForm);
  const [childForm, setChildForm] = useState<NewChildForm>(defaultChildForm);
  const [createForm, setCreateForm] = useState({
    householdName: "",
    ownerName: "",
  });
  const [joinCode, setJoinCode] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);
  const confirmDialogRef = useRef<HTMLElement | null>(null);
  const confirmCancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const stored = readStoredState();

    if (stored) {
      setHousehold(stored.household);
      setChildren(stored.children);
      setSchedule(stored.schedule);
      setScheduleForm((current) => ({
        ...current,
        childId: resolveScheduleChildId(stored.children, current.childId),
      }));
    } else {
      setScheduleForm((current) => ({
        ...current,
        childId: resolveScheduleChildId(sampleChildren, current.childId),
      }));
    }

    setSelectedDay(getTodayIndex());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        household,
        children,
        schedule,
      }),
    );
  }, [children, household, schedule, storageReady]);

  useEffect(() => {
    setHasPendingChanges(false);
  }, [household?.updatedAt]);

  useEffect(() => {
    if (!hasPendingChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasPendingChanges]);

  useEffect(() => {
    setScheduleForm((current) => {
      const nextChildId = resolveScheduleChildId(children, current.childId);

      if (nextChildId === current.childId) {
        return current;
      }

      return {
        ...current,
        childId: nextChildId,
      };
    });
  }, [children]);

  useEffect(() => {
    if (!confirmState) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialogElement = confirmDialogRef.current;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    confirmCancelButtonRef.current?.focus();

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeConfirmation(false);
        return;
      }

      if (event.key !== "Tab" || !dialogElement) {
        return;
      }

      const focusableElements = Array.from(
        dialogElement.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (!focusableElements.length) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", handleDialogKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDialogKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [confirmState]);

  useEffect(() => {
    const abortController = new AbortController();

    async function checkBackend() {
      try {
        const response = await fetch("/api/households?check=1", {
          signal: abortController.signal,
        });
        const payload = (await response.json()) as { available: boolean };

        setBackendReady(payload.available);
        setStatusMessage(
          payload.available
            ? household
              ? `Connected to household ${household.name}.`
              : "Shared storage is ready. Create or join a household."
            : "Supabase is not connected yet. The app is running in local mode.",
        );
      } catch {
        setBackendReady(false);
        setStatusMessage("Could not confirm shared storage. Using local mode for now.");
      }
    }

    checkBackend();

    return () => abortController.abort();
  }, [household]);

  const todaySchedule = useMemo(
    () =>
      children.map((child) => ({
        child,
        items: schedule
          .filter((item) => item.childId === child.id && item.dayOfWeek === selectedDay)
          .sort(itemSort),
      })),
    [children, schedule, selectedDay],
  );

  const weekSchedule = useMemo(
    () =>
      DAY_LABELS.map((label, dayOfWeek) => ({
        label,
        items: schedule.filter((item) => item.dayOfWeek === dayOfWeek).sort(itemSort),
      })),
    [schedule],
  );

  const gapAlerts = useMemo(
    () => buildGapAlerts(children, schedule, selectedDay),
    [children, schedule, selectedDay],
  );

  const pickupSummary = useMemo(
    () =>
      todaySchedule.flatMap(({ child, items }) =>
        items.map((item) => ({
          id: `${child.id}-${item.id}`,
          childName: child.name,
          title: item.title,
          owner: item.pickupOwner,
          when: item.end,
        })),
      ),
    [todaySchedule],
  );

  const hasChildren = children.length > 0;

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, currentTab: ActiveTab) {
    const currentIndex = TAB_OPTIONS.findIndex((tab) => tab.id === currentTab);

    if (currentIndex === -1) {
      return;
    }

    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TAB_OPTIONS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TAB_OPTIONS.length) % TAB_OPTIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = TAB_OPTIONS.length - 1;
    } else {
      return;
    }

    event.preventDefault();

    const nextTab = TAB_OPTIONS[nextIndex];

    setActiveTab(nextTab.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`tab-${nextTab.id}`)?.focus();
    });
  }

  function applyHouseholdBundle(bundle: HouseholdBundle) {
    setHousehold(bundle.household);
    setChildren(bundle.children);
    setSchedule(bundle.schedule);
    setHasPendingChanges(false);
    setScheduleForm((current) => ({
      ...current,
      childId: resolveScheduleChildId(bundle.children, current.childId),
    }));
  }

  function requestConfirmation(options: ConfirmState) {
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState(options);
    });
  }

  function closeConfirmation(confirmed: boolean) {
    confirmResolverRef.current?.(confirmed);
    confirmResolverRef.current = null;
    setConfirmState(null);
  }

  async function createHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!backendReady) {
      setStatusMessage("Connect Supabase first to create a shared household.");
      return;
    }

    if (hasPendingChanges) {
      const shouldCreate = await requestConfirmation({
        title: "Create a new shared household?",
        description:
          "This will replace your unsynced local changes with a new shared household. Sync first if you want to keep your edits.",
        confirmLabel: "Create household",
        cancelLabel: "Keep local changes",
      });

      if (!shouldCreate) {
        setStatusMessage("Create canceled so your unsynced local changes stay on this device.");
        return;
      }
    }

    setIsWorking(true);
    setStatusMessage("Creating household...");

    try {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          householdName: createForm.householdName,
          ownerName: createForm.ownerName,
        }),
      });
      const payload = (await response.json()) as
        | { household: HouseholdBundle }
        | { error: string };

      if (!response.ok || !("household" in payload)) {
        throw new Error("error" in payload ? payload.error : "Could not create household.");
      }

      applyHouseholdBundle(payload.household);
      setStatusMessage(
        `Household created. Share code ${payload.household.household.accessCode} with your partner.`,
      );
      setCreateForm({ householdName: "", ownerName: "" });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not create household.");
    } finally {
      setIsWorking(false);
    }
  }

  async function joinHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!backendReady) {
      setStatusMessage("Connect Supabase first to join a shared household.");
      return;
    }

    if (hasPendingChanges) {
      const shouldJoin = await requestConfirmation({
        title: "Join this shared household?",
        description:
          "This will replace your unsynced local changes with the shared household data. Sync first if you want to keep your edits.",
        confirmLabel: "Join household",
        cancelLabel: "Keep local changes",
      });

      if (!shouldJoin) {
        setStatusMessage("Join canceled so your unsynced local changes stay on this device.");
        return;
      }
    }

    setIsWorking(true);
    setStatusMessage("Joining household...");

    try {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "join",
          accessCode: joinCode.toUpperCase(),
        }),
      });
      const payload = (await response.json()) as
        | { household: HouseholdBundle }
        | { error: string };

      if (!response.ok || !("household" in payload)) {
        throw new Error("error" in payload ? payload.error : "Could not join household.");
      }

      applyHouseholdBundle(payload.household);
      setStatusMessage(`Joined ${payload.household.household.name}.`);
      setJoinCode("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not join household.");
    } finally {
      setIsWorking(false);
    }
  }

  async function syncHousehold() {
    if (!household) {
      setStatusMessage("Create or join a household before syncing.");
      return;
    }

    if (!backendReady) {
      setStatusMessage("Supabase is not connected yet, so sync is unavailable.");
      return;
    }

    setIsWorking(true);
    setStatusMessage("Saving changes to the shared household...");

    try {
      const response = await fetch(`/api/households/${household.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          children,
          schedule,
        }),
      });
      const payload = (await response.json()) as
        | { household: HouseholdBundle }
        | { error: string };

      if (!response.ok || !("household" in payload)) {
        throw new Error("error" in payload ? payload.error : "Could not save household.");
      }

      applyHouseholdBundle(payload.household);
      setStatusMessage(`Saved. Last sync updated household code ${payload.household.household.accessCode}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not sync household.");
    } finally {
      setIsWorking(false);
    }
  }

  async function refreshHousehold() {
    if (!household) {
      setStatusMessage("Create or join a household before refreshing.");
      return;
    }

    if (!backendReady) {
      setStatusMessage("Supabase is not connected yet, so refresh is unavailable.");
      return;
    }

    if (hasPendingChanges) {
      const shouldRefresh = await requestConfirmation({
        title: "Refresh from shared household?",
        description:
          "This will replace your unsynced local changes with the latest shared household data. Sync first if you want to keep your edits.",
        confirmLabel: "Refresh household",
        cancelLabel: "Keep local changes",
      });

      if (!shouldRefresh) {
        setStatusMessage("Refresh canceled so your unsynced local changes stay on this device.");
        return;
      }
    }

    setIsWorking(true);
    setStatusMessage("Refreshing shared household...");

    try {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "join",
          accessCode: household.accessCode,
        }),
      });
      const payload = (await response.json()) as
        | { household: HouseholdBundle }
        | { error: string };

      if (!response.ok || !("household" in payload)) {
        throw new Error("error" in payload ? payload.error : "Could not refresh household.");
      }

      applyHouseholdBundle(payload.household);
      setStatusMessage(`Refreshed ${payload.household.household.name}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not refresh household.");
    } finally {
      setIsWorking(false);
    }
  }

  async function copyAccessCode() {
    if (!household) {
      return;
    }

    try {
      await navigator.clipboard.writeText(household.accessCode);
      setStatusMessage(`Copied code ${household.accessCode}.`);
    } catch {
      setStatusMessage("Could not copy the code automatically.");
    }
  }

  function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasChildren) {
      setStatusMessage("Add a child profile before creating schedule items.");
      return;
    }

    if (!scheduleForm.childId || !children.some((child) => child.id === scheduleForm.childId)) {
      setStatusMessage("Choose a valid child for this schedule item.");
      return;
    }

    if (!scheduleForm.title.trim() || !scheduleForm.location.trim()) {
      setStatusMessage("Schedule title and location are required.");
      return;
    }

    if (!hasValidTimeRange(scheduleForm.start, scheduleForm.end)) {
      setStatusMessage("Start time must be earlier than end time.");
      return;
    }

    const overlapsExistingItem = schedule.some(
      (item) =>
        item.childId === scheduleForm.childId &&
        item.dayOfWeek === scheduleForm.dayOfWeek &&
        toMinutes(scheduleForm.start) < toMinutes(item.end) &&
        toMinutes(scheduleForm.end) > toMinutes(item.start),
    );

    if (overlapsExistingItem) {
      setStatusMessage("This schedule overlaps another item for the same child.");
      return;
    }

    const nextItem: ScheduleItem = {
      ...scheduleForm,
      id: crypto.randomUUID(),
    };

    setSchedule((current) => [...current, nextItem]);
    setHasPendingChanges(true);
    setScheduleForm((current) => ({
      ...current,
      title: "",
      location: "",
      notes: "",
      packingList: "",
    }));
    setStatusMessage("Added schedule item locally. Sync to share it with your partner.");
  }

  function handleChildSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!childForm.name.trim() || !childForm.school.trim()) {
      setStatusMessage("Child name and school are required.");
      return;
    }

    const nextChild: ChildProfile = {
      ...childForm,
      id: crypto.randomUUID(),
    };

    const nextChildren = [...children, nextChild];

    setChildren(nextChildren);
    setHasPendingChanges(true);
    setScheduleForm((current) => ({
      ...current,
      childId: resolveScheduleChildId(nextChildren, current.childId),
    }));
    setChildForm(defaultChildForm);
    setStatusMessage("Added child locally. Sync when you want to share the update.");
  }

  async function removeChild(id: string) {
    const child = children.find((entry) => entry.id === id);

    if (!child) {
      return;
    }

    const childScheduleCount = schedule.filter((item) => item.childId === id).length;
    const shouldRemoveChild = await requestConfirmation({
      eyebrow: "Local change",
      title: `Remove ${child.name}?`,
      description:
        childScheduleCount > 0
          ? `This will also remove ${childScheduleCount} linked schedule item${childScheduleCount === 1 ? "" : "s"} on this device until you sync again.`
          : "This child profile will be removed on this device until you sync again.",
      confirmLabel: "Remove child",
      cancelLabel: "Keep child",
    });

    if (!shouldRemoveChild) {
      setStatusMessage("Remove canceled so this child profile stays in the plan.");
      return;
    }

    const remainingChildren = children.filter((child) => child.id !== id);

    setChildren(remainingChildren);
    setSchedule((current) => current.filter((item) => item.childId !== id));
    setHasPendingChanges(true);

    setScheduleForm((current) => ({
      ...current,
      childId:
        current.childId === id
          ? remainingChildren[0]?.id ?? ""
          : current.childId,
    }));
    setStatusMessage("Removed child locally. Sync to apply it for both parents.");
  }

  async function removeItem(id: string) {
    const item = schedule.find((entry) => entry.id === id);

    if (!item) {
      return;
    }

    const shouldRemoveItem = await requestConfirmation({
      eyebrow: "Local change",
      title: `Remove ${item.title}?`,
      description:
        "This schedule item will be removed on this device until you sync again.",
      confirmLabel: "Remove item",
      cancelLabel: "Keep item",
    });

    if (!shouldRemoveItem) {
      setStatusMessage("Remove canceled so this schedule item stays in the plan.");
      return;
    }

    setSchedule((current) => current.filter((entry) => entry.id !== id));
    setHasPendingChanges(true);
    setStatusMessage("Removed schedule item locally. Sync to apply it for both parents.");
  }

  async function resetToLocalDemo() {
    if (hasPendingChanges) {
      const shouldLeave = await requestConfirmation({
        title: "Leave this household?",
        description:
          "This will discard your unsynced local changes and return this device to the demo plan.",
        confirmLabel: "Leave household",
        cancelLabel: "Stay here",
      });

      if (!shouldLeave) {
        setStatusMessage("Leave canceled so your unsynced local changes stay on this device.");
        return;
      }
    }

    setHousehold(null);
    setChildren(sampleChildren);
    setSchedule(sampleSchedule);
    setHasPendingChanges(false);
    setScheduleForm({
      ...defaultScheduleForm,
      childId: resolveScheduleChildId(sampleChildren, defaultScheduleForm.childId),
    });
    setStatusMessage("Returned to local demo mode.");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>오늘 누가 데려가야 하는지, 공백이 언제 생기는지 바로 보이게.</h1>
          <p>
            맞벌이 부모가 아이의 학교, 학원, 돌봄, 준비물을 한 화면에서
            정리하고 같은 데이터를 함께 보는 공개 베타 버전입니다.
          </p>

          <div className={styles.statusStrip}>
            <div>
              <strong>{household?.name ?? "No shared household yet"}</strong>
              <p
                className={styles.statusMessage}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {statusMessage}
              </p>
              <small className={styles.syncNote}>
                Last synced {formatSyncTime(household?.updatedAt)}
              </small>
            </div>
            <div className={styles.statusActions}>
              <span className={hasPendingChanges ? styles.dirtyPill : styles.cleanPill}>
                {hasPendingChanges ? "Unsynced changes" : "Everything synced"}
              </span>
              {household ? (
                <button
                  type="button"
                  className={styles.codePill}
                  onClick={copyAccessCode}
                >
                  Code {household.accessCode}
                </button>
              ) : null}
              {household ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={refreshHousehold}
                  disabled={isWorking}
                >
                  Refresh household
                </button>
              ) : null}
              <button
                type="button"
                className={styles.primaryButton}
                onClick={syncHousehold}
                disabled={isWorking || !household}
              >
                {isWorking ? "Working..." : "Sync household"}
              </button>
              {household ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={resetToLocalDemo}
                >
                  Leave household
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.heroCard}>
          <p className={styles.cardLabel}>Shared household setup</p>

          <form className={styles.inlineForm} onSubmit={createHousehold}>
            <strong>Create a new household</strong>
            <input
              aria-label="Household name"
              value={createForm.householdName}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  householdName: event.target.value,
                }))
              }
              placeholder="Kim family"
            />
            <input
              aria-label="Owner name"
              value={createForm.ownerName}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  ownerName: event.target.value,
                }))
              }
              placeholder="Your name"
            />
            <button type="submit" disabled={isWorking || !backendReady}>
              Create and get code
            </button>
          </form>

          <form className={styles.inlineForm} onSubmit={joinHousehold}>
            <strong>Join with a code</strong>
            <input
              aria-label="Household access code"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              onBlur={() => setJoinCode((current) => normalizeAccessCode(current))}
              placeholder="ABC123"
              maxLength={6}
            />
            <button type="submit" disabled={isWorking || !backendReady}>
              Join household
            </button>
          </form>
        </div>
      </section>

      <div className={styles.infoBanner}>
        <strong>{backendReady ? "Shared mode ready" : "Local mode active"}</strong>
        <span>
          {backendReady
            ? "Changes stay local until you press sync. This keeps shared edits deliberate during beta."
            : "You can keep building the plan locally now, then connect Supabase to share with testers."}
        </span>
        {household ? (
          <span className={styles.setupHint}>
            Parent A syncs changes. Parent B presses `Refresh household` to pull the latest plan.
          </span>
        ) : null}
        {household && hasPendingChanges ? (
          <span className={styles.setupHint}>
            You have unsynced local changes. Create, join, refresh, or leave will ask before replacing them.
          </span>
        ) : null}
        {!backendReady ? (
          <span className={styles.setupHint}>
            Add `.env.local` with Supabase keys to turn on share codes and sync.
          </span>
        ) : null}
      </div>

      <nav className={styles.tabs} aria-label="Views" role="tablist">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            aria-controls={`panel-${tab.id}`}
            tabIndex={tab.id === activeTab ? 0 : -1}
            className={tab.id === activeTab ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "today" ? (
        <section
          className={styles.panel}
          role="tabpanel"
          id="panel-today"
          aria-labelledby="tab-today"
        >
          <div className={styles.sectionHeader}>
            <div>
              <h2>Today view</h2>
              <p>Choose a weekday and check handoffs before the day starts.</p>
            </div>
            <div className={styles.dayPicker}>
              {DAY_LABELS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={index === selectedDay ? styles.activeDay : styles.dayButton}
                  onClick={() => setSelectedDay(index)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.alertGrid}>
            <article className={styles.summaryCard}>
              <p className={styles.cardLabel}>Priority checks</p>
              <strong>{gapAlerts.length} alerts to review</strong>
              <span>
                {gapAlerts.length
                  ? "These are the moments most likely to create stress."
                  : "No obvious care gap on this day."}
              </span>
            </article>
            <article className={styles.summaryCard}>
              <p className={styles.cardLabel}>Children</p>
              <strong>{children.length}</strong>
              <span>Profiles currently loaded in this household.</span>
            </article>
            <article className={styles.summaryCard}>
              <p className={styles.cardLabel}>Scheduled blocks</p>
              <strong>{todaySchedule.reduce((sum, entry) => sum + entry.items.length, 0)}</strong>
              <span>School, academy, care, and pickup items for the selected day.</span>
            </article>
          </div>

          <div className={styles.contentGrid}>
            <div className={styles.timelineColumn}>
              {todaySchedule.map(({ child, items }) => (
                <article key={child.id} className={styles.timelineCard}>
                  <div className={styles.timelineHeader}>
                    <div>
                      <h3>{child.name}</h3>
                      <p>
                        {child.grade} · {child.school}
                      </p>
                    </div>
                    <span className={styles.dismissal}>
                      Default dismissal {child.defaultDismissal}
                    </span>
                  </div>

                  <div className={styles.timelineList}>
                    {items.length ? (
                      items.map((item) => (
                        <article key={item.id} className={styles.timelineItem}>
                          <div>
                            <strong>{item.title}</strong>
                            <p>
                              {item.start} - {item.end} · {item.location}
                            </p>
                          </div>
                          <div className={styles.timelineMeta}>
                            <span
                              className={
                                item.pickupOwner === "TBD"
                                  ? styles.warningPill
                                  : styles.ownerPill
                              }
                            >
                              {item.pickupOwner}
                            </span>
                            <small>{item.packingList || "No packing note"}</small>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className={styles.emptyState}>
                        No events for this child on {DAY_LABELS[selectedDay]}.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <aside className={styles.alertColumn}>
              <article className={styles.alertPanel}>
                <h3>Care gap alerts</h3>
                <div className={styles.alertList}>
                  {gapAlerts.length ? (
                    gapAlerts.map((alert) => (
                      <article
                        key={`${alert.childName}-${alert.start}-${alert.end}-${alert.reason}`}
                        className={styles.alertItem}
                      >
                        <strong>{alert.childName}</strong>
                        <p>
                          {alert.start} - {alert.end} ·{" "}
                          {formatDuration(alert.durationMinutes)}
                        </p>
                        <span>{alert.reason}</span>
                      </article>
                    ))
                  ) : (
                    <p className={styles.emptyState}>
                      Nothing urgent for this day right now.
                    </p>
                  )}
                </div>
              </article>

              <article className={styles.alertPanel}>
                <h3>Today&apos;s pickup owners</h3>
                <div className={styles.pickupListCompact}>
                  {pickupSummary.length ? (
                    pickupSummary.map((pickup) => (
                      <article key={pickup.id} className={styles.compactPickup}>
                        <strong>{pickup.childName}</strong>
                        <span>{pickup.title}</span>
                        <em>
                          {pickup.when} · {pickup.owner}
                        </em>
                      </article>
                    ))
                  ) : (
                    <p className={styles.emptyState}>No pickup items for this day yet.</p>
                  )}
                </div>
              </article>
            </aside>
          </div>
        </section>
      ) : null}

      {activeTab === "week" ? (
        <section
          className={styles.panel}
          role="tabpanel"
          id="panel-week"
          aria-labelledby="tab-week"
        >
          <div className={styles.sectionHeader}>
            <div>
              <h2>This week</h2>
              <p>Scan the whole week to see patterns before they become a problem.</p>
            </div>
          </div>

          <div className={styles.weekGrid}>
            {weekSchedule.map((day) => (
              <article key={day.label} className={styles.weekCard}>
                <div className={styles.weekHeader}>
                  <h3>{day.label}</h3>
                  <span>{day.items.length} items</span>
                </div>
                <div className={styles.weekList}>
                  {day.items.length ? (
                    day.items.map((item) => {
                      const child = children.find((entry) => entry.id === item.childId);

                      return (
                        <article key={item.id} className={styles.weekItem}>
                          <strong>{item.title}</strong>
                          <p>
                            {item.start} - {item.end}
                          </p>
                          <span>
                            {child?.name ?? "Unknown child"} · {item.pickupOwner}
                          </span>
                        </article>
                      );
                    })
                  ) : (
                    <p className={styles.emptyState}>No events planned.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "kids" ? (
        <section
          className={styles.panel}
          role="tabpanel"
          id="panel-kids"
          aria-labelledby="tab-kids"
        >
          <div className={styles.sectionHeader}>
            <div>
              <h2>Child setup</h2>
              <p>
                Enter child profiles and recurring schedule items. Then sync when the
                household is ready to share.
              </p>
            </div>
          </div>

          <div className={styles.setupGrid}>
            <form className={styles.formCard} onSubmit={handleChildSubmit}>
              <h3>Add child profile</h3>

              <label className={styles.field}>
                <span>Name</span>
                <input
                  value={childForm.name}
                  onChange={(event) =>
                    setChildForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Seo-jun"
                />
              </label>

              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Grade</span>
                  <input
                    value={childForm.grade}
                    onChange={(event) =>
                      setChildForm((current) => ({
                        ...current,
                        grade: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={styles.field}>
                  <span>Default dismissal</span>
                  <input
                    type="time"
                    value={childForm.defaultDismissal}
                    onChange={(event) =>
                      setChildForm((current) => ({
                        ...current,
                        defaultDismissal: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span>School</span>
                <input
                  value={childForm.school}
                  onChange={(event) =>
                    setChildForm((current) => ({
                      ...current,
                      school: event.target.value,
                    }))
                  }
                  placeholder="Haedam Elementary"
                />
              </label>

              <button className={styles.primaryButton} type="submit">
                Add child
              </button>

              <div className={styles.savedList}>
                {children.map((child) => (
                  <article key={child.id} className={styles.savedItem}>
                    <div>
                      <strong>{child.name}</strong>
                      <p>
                        {child.grade} · {child.school}
                      </p>
                      <span>Dismissal {child.defaultDismissal}</span>
                    </div>
                    <button type="button" onClick={() => removeChild(child.id)}>
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </form>

            <form className={styles.formCard} onSubmit={handleScheduleSubmit}>
              <h3>Add schedule item</h3>

              <label className={styles.field}>
                <span>Child</span>
                <select
                  value={scheduleForm.childId}
                  disabled={!hasChildren}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      childId: event.target.value,
                    }))
                  }
                >
                  {hasChildren ? (
                    children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Add a child first</option>
                  )}
                </select>
              </label>

              {!hasChildren ? (
                <p className={styles.inlineNotice}>
                  Add at least one child profile before creating schedule items.
                </p>
              ) : null}

              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Weekday</span>
                  <select
                    value={scheduleForm.dayOfWeek}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        dayOfWeek: Number(event.target.value),
                      }))
                    }
                  >
                    {DAY_LABELS.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Type</span>
                  <select
                    value={scheduleForm.type}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        type: event.target.value as ScheduleType,
                      }))
                    }
                  >
                    <option value="school">School</option>
                    <option value="academy">Academy</option>
                    <option value="care">Care</option>
                    <option value="activity">Activity</option>
                    <option value="pickup">Pickup</option>
                  </select>
                </label>
              </div>

              <label className={styles.field}>
                <span>Title</span>
                <input
                  value={scheduleForm.title}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Math academy"
                />
              </label>

              <label className={styles.field}>
                <span>Location</span>
                <input
                  value={scheduleForm.location}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Dream Math"
                />
              </label>

              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Start</span>
                  <input
                    type="time"
                    value={scheduleForm.start}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        start: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={styles.field}>
                  <span>End</span>
                  <input
                    type="time"
                    value={scheduleForm.end}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        end: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span>Who handles pickup?</span>
                <select
                  value={scheduleForm.pickupOwner}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      pickupOwner: event.target.value as ParentRole,
                    }))
                  }
                >
                  {PARENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Packing list</span>
                <input
                  value={scheduleForm.packingList}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      packingList: event.target.value,
                    }))
                  }
                  placeholder="Workbook, indoor socks"
                />
              </label>

              <label className={styles.field}>
                <span>Notes</span>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Dad must leave by 2:30pm"
                />
              </label>

              <button className={styles.primaryButton} type="submit" disabled={!hasChildren}>
                Save schedule item
              </button>

              <div className={styles.savedList}>
                {[...schedule].sort(itemSort).map((item) => {
                  const child = children.find((entry) => entry.id === item.childId);

                  return (
                    <article key={item.id} className={styles.savedItem}>
                      <div>
                        <strong>{item.title}</strong>
                        <p>
                          {DAY_LABELS[item.dayOfWeek]} · {child?.name ?? "Unknown"} ·{" "}
                          {item.start} - {item.end}
                        </p>
                        <span>
                          {item.location} · {item.pickupOwner}
                        </span>
                      </div>
                      <button type="button" onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </article>
                  );
                })}
              </div>
            </form>
          </div>
        </section>
      ) : null}

      {confirmState ? (
        <div
          className={styles.modalScrim}
          role="presentation"
          onClick={() => closeConfirmation(false)}
        >
          <section
            className={styles.confirmModal}
            ref={confirmDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-description"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <p className={styles.cardLabel}>{confirmState.eyebrow ?? "Unsynced changes"}</p>
            <h2 id="confirm-title">{confirmState.title}</h2>
            <p id="confirm-description" className={styles.modalDescription}>
              {confirmState.description}
            </p>
            <div className={styles.modalActions}>
              <button
                ref={confirmCancelButtonRef}
                type="button"
                className={styles.modalSecondaryButton}
                onClick={() => closeConfirmation(false)}
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                className={styles.modalPrimaryButton}
                onClick={() => closeConfirmation(true)}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
