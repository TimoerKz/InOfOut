"use client";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Copy,
  MapPin,
  MessageCircle,
  Plus,
  Share2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  createGroup,
  getMyGroups,
  getOrCreateAnonymousSession,
  getGroupPreview,
  joinGroup,
} from "../lib/group-service";
import { supabase } from "../lib/supabase";

const MN = [
    "Januari",
    "Februari",
    "Maart",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Augustus",
    "September",
    "Oktober",
    "November",
    "December",
  ],
  WD = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const dk = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isoWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};
const emptyOption = () => ({ date: dk(new Date()), time: "19:00" });

export default function Home() {
  const [group, setGroup] = useState(),
    [groups, setGroups] = useState([]),
    [session, setSession] = useState(),
    [events, setEvents] = useState([]),
    [hidden, setHidden] = useState([]),
    [selected, setSelected] = useState(),
    [suggestions, setSuggestions] = useState([]),
    [modal, setModal] = useState(false),
    [onboard, setOnboard] = useState(false),
    [shareModal, setShareModal] = useState(false),
    [copied, setCopied] = useState(false),
    [joinInvite, setJoinInvite] = useState(null),
    [error, setError] = useState(""),
    [cursor, setCursor] = useState(new Date()),
    [view, setView] = useState("Maand"),
    [renaming, setRenaming] = useState(false),
    [groupPicker, setGroupPicker] = useState(false),
    [newGroup, setNewGroup] = useState(false),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    location: "",
    color: "coral",
    options: [emptyOption()],
  });

  const load = async (g, s = session) => {
    let r = await supabase
      .from("activity_options")
      .select(
        "id,starts_at,activities!activity_options_activity_id_fkey!inner(id,title,location,color,status,selected_option_id,created_by),votes(status,user_id,profiles(id,display_name))",
      )
      .eq("activities.group_id", g.id)
      .order("starts_at");
    if (r.error) throw r.error;
    const formatted = r.data.map((o) => {
      let d = new Date(o.starts_at),
        a = o.activities;
      const getVoterName = (v) => {
        const isMe = s?.user?.id && v.user_id === s.user.id;
        const name = v.profiles?.display_name || (isMe ? "Jij" : "Groepslid");
        return isMe && v.profiles?.display_name ? `${name} (Jij)` : name;
      };

      const ins = (o.votes || [])
        .filter((v) => v.status === "in")
        .map((v) => ({
          userId: v.user_id,
          name: getVoterName(v),
          isMe: s?.user?.id && v.user_id === s.user.id,
        }));

      const outs = (o.votes || [])
        .filter((v) => v.status === "out")
        .map((v) => ({
          userId: v.user_id,
          name: getVoterName(v),
          isMe: s?.user?.id && v.user_id === s.user.id,
        }));

      const maybes = (o.votes || [])
        .filter((v) => v.status === "maybe")
        .map((v) => ({
          userId: v.user_id,
          name: getVoterName(v),
          isMe: s?.user?.id && v.user_id === s.user.id,
        }));

      return {
        id: a.id,
        optionId: o.id,
        title: a.title,
        color: a.color || "coral",
        status: a.status || "open",
        selectedOptionId: a.selected_option_id,
        isConfirmed: a.status === "confirmed" && a.selected_option_id === o.id,
        isDismissed: a.status === "confirmed" && a.selected_option_id !== o.id,
        createdBy: a.created_by,
        date: dk(d),
        time: d.toLocaleTimeString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        place: a.location || "Nog te bepalen",
        ins,
        outs,
        maybes,
        mine: o.votes?.find((v) => s?.user?.id && v.user_id === s.user.id)?.status,
      };
    });
    setEvents(formatted);
    return formatted;
  };

  useEffect(() => {
    (async () => {
      try {
        let s = await getOrCreateAnonymousSession();
        setSession(s);

        const params = new URLSearchParams(window.location.search);
        const inviteParam = params.get("join") || params.get("g");

        let gs = await getMyGroups();
        setGroups(gs);

        if (inviteParam) {
          const alreadyMember = gs.find(
            (g) => g.slug === inviteParam || g.id === inviteParam,
          );
          if (alreadyMember) {
            setGroup(alreadyMember);
            await load(alreadyMember, s);
            return;
          }

          const preview = await getGroupPreview(inviteParam);
          if (preview) {
            setJoinInvite({ slugOrId: inviteParam, preview });
            return;
          } else {
            setJoinInvite({
              slugOrId: inviteParam,
              preview: { name: "deze groep" },
            });
            return;
          }
        }

        if (!gs.length) {
          setOnboard(true);
        } else {
          setGroup(gs[0]);
          await load(gs[0], s);
        }
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  const start = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      let f = new FormData(e.currentTarget),
        g = await createGroup(f.get("group"), f.get("name"));
      const ownerGroup = { ...g, role: "owner" };
      setGroup(ownerGroup);
      setGroups((current) => [...current, ownerGroup]);
      setOnboard(false);
      setNewGroup(false);
      setGroupPicker(false);
      await load(ownerGroup);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      const name = f.get("name")?.trim();
      if (!name || !joinInvite?.slugOrId) return;

      const joined = await joinGroup(joinInvite.slugOrId, name);
      setGroup(joined);
      setGroups((current) =>
        current.some((g) => g.id === joined.id) ? current : [...current, joined],
      );
      setJoinInvite(null);

      if (typeof window !== "undefined" && window.history.replaceState) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }

      await load(joined, session);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const getShareUrl = () => {
    if (typeof window === "undefined" || !group) return "";
    return `${window.location.origin}/?join=${group.slug || group.id}`;
  };

  const copyShareLink = async () => {
    const url = getShareUrl();
    if (!url) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setError("Kopiëren mislukt. Kopieer de link handmatig.");
    }
  };

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      let a = await supabase
        .from("activities")
        .insert({
          group_id: group.id,
          title: form.title,
          location: form.location || null,
          color: form.color,
          created_by: session.user.id,
        })
        .select()
        .single();
      if (a.error) throw a.error;
      let rows = form.options.map((o) => ({
          activity_id: a.data.id,
          starts_at: new Date(`${o.date}T${o.time}`).toISOString(),
        })),
        r = await supabase.from("activity_options").insert(rows);
      if (r.error) throw r.error;
      setModal(false);
      setForm({
        title: "",
        location: "",
        color: "coral",
        options: [emptyOption()],
      });
      await load(group);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openNewActivity = (date = new Date()) => {
    setSelected(undefined);
    setForm({
      title: "",
      location: "",
      color: "coral",
      options: [{ date: dk(date), time: "19:00" }],
    });
    setModal(true);
  };

  const vote = async (status) => {
    let r = await supabase
      .from("votes")
      .upsert(
        { option_id: selected.optionId, user_id: session.user.id, status },
        { onConflict: "option_id,user_id" },
      );
    if (r.error) {
      setError(r.error.message);
    } else {
      const refreshed = await load(group, session);
      if (refreshed) {
        const updated = refreshed.find((e) => e.optionId === selected.optionId);
        if (updated) setSelected(updated);
      }
    }
  };

  const loadSuggestions = async (activityId) => {
    if (!supabase || !activityId) return;
    try {
      const { data, error: sugErr } = await supabase
        .from("location_suggestions")
        .select("id, label, user_id, profiles(display_name)")
        .eq("activity_id", activityId)
        .order("created_at", { ascending: true });
      if (!sugErr && data) {
        setSuggestions(data);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    if (selected?.id) {
      loadSuggestions(selected.id);
    } else {
      setSuggestions([]);
    }
  }, [selected?.id]);

  const addLocation = async (e) => {
    e.preventDefault();
    let f = new FormData(e.currentTarget),
      label = f.get("location")?.trim();
    if (!label || !selected?.id) return;
    setBusy(true);
    let r = await supabase
      .from("location_suggestions")
      .insert({ activity_id: selected.id, user_id: session.user.id, label });
    setBusy(false);
    if (r.error) {
      if (r.error.code === "PGRST205") {
        setError(
          "De database-tabel voor locatievoorstellen ontbreekt nog. Voer 004_location_suggestions.sql uit in Supabase.",
        );
      } else {
        setError(r.error.message);
      }
    } else {
      e.currentTarget.reset();
      await loadSuggestions(selected.id);
    }
  };

  const applySuggestedLocation = async (activityId, newLocation) => {
    setBusy(true);
    const { error: updateErr } = await supabase
      .from("activities")
      .update({ location: newLocation })
      .eq("id", activityId);
    setBusy(false);
    if (updateErr) {
      setError(updateErr.message);
    } else {
      const refreshed = await load(group, session);
      if (refreshed) {
        const updated = refreshed.find((e) => e.optionId === selected?.optionId);
        if (updated) setSelected(updated);
      }
    }
  };

  const renameGroup = async (e) => {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get("groupName")?.trim();
    if (!name) return;
    setBusy(true);
    const { error: renameError } = await supabase
      .from("groups")
      .update({ name })
      .eq("id", group.id);
    setBusy(false);
    if (renameError) setError(renameError.message);
    else {
      setGroup({ ...group, name });
      setRenaming(false);
    }
  };

  const confirmOption = async (activityId, optionId) => {
    setBusy(true);
    const { error: confirmErr } = await supabase
      .from("activities")
      .update({
        status: "confirmed",
        selected_option_id: optionId,
      })
      .eq("id", activityId);
    setBusy(false);

    if (confirmErr) {
      setError(confirmErr.message);
    } else {
      const refreshed = await load(group, session);
      if (refreshed) {
        const updated = refreshed.find((e) => e.optionId === selected?.optionId);
        if (updated) setSelected(updated);
      }
    }
  };

  const unconfirmOption = async (activityId) => {
    setBusy(true);
    const { error: unconfirmErr } = await supabase
      .from("activities")
      .update({
        status: "open",
        selected_option_id: null,
      })
      .eq("id", activityId);
    setBusy(false);

    if (unconfirmErr) {
      setError(unconfirmErr.message);
    } else {
      const refreshed = await load(group, session);
      if (refreshed) {
        const updated = refreshed.find((e) => e.optionId === selected?.optionId);
        if (updated) setSelected(updated);
      }
    }
  };

  const activities = useMemo(
    () => [
      ...new Map(
        events.map((e) => [e.id, { title: e.title, color: e.color }]),
      ).entries(),
    ],
    [events],
  );

  const byDate = useMemo(
    () =>
      events
        .filter((e) => !hidden.includes(e.id))
        .reduce((a, e) => ((a[e.date] ??= []).push(e), a), {}),
    [events, hidden],
  );

  const months = view === "Jaar" ? 12 : view === "Kwartaal" ? 3 : 1,
    startMonth =
      view === "Jaar"
        ? 0
        : view === "Kwartaal"
          ? Math.floor(cursor.getMonth() / 3) * 3
          : cursor.getMonth();

  const shift = (n) =>
    setCursor(
      new Date(
        cursor.getFullYear(),
        cursor.getMonth() +
          n *
            (view === "Jaar"
              ? 12
              : view === "Kwartaal"
                ? 3
                : view === "Week"
                  ? 0
                  : 1),
        cursor.getDate(),
      ),
    );

  return (
    <main>
      <header>
        <div className="brand">
          <span className="brand-mark">i/o</span>InOfOut
        </div>
        <div className="header-actions">
          <button
            className="group group-button"
            onClick={() => setGroupPicker(true)}
            title="Groep kiezen of beheren"
          >
            <Users size={17} />
            {group?.name || "Nieuwe groep"}
          </button>
          {group && (
            <button
              className="share-button"
              onClick={() => setShareModal(true)}
              title="Deel uitnodigingslink"
            >
              <Share2 size={15} />
              <span>Deel link</span>
            </button>
          )}
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">GROEPSAGENDA</p>
          <h1>Wanneer zien we elkaar?</h1>
          <p className="subtle">Meerdere momenten, één gezamenlijke keuze.</p>
        </div>
        <button
          className="primary"
          disabled={!group}
          onClick={() => openNewActivity()}
        >
          <Plus size={18} />
          Nieuwe activiteit
        </button>
      </section>

      <nav className="toolbar">
        <div className="views">
          {["Lijst", "Week", "Maand", "Kwartaal", "Jaar"].map((v) => (
            <button
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
              key={v}
            >
              {v}
            </button>
          ))}
        </div>
        {view !== "Lijst" && (
          <div className="month-nav">
            <button onClick={() => shift(-1)}>←</button>
            {view !== "Week" && (
              <input
                className="month-picker"
                type="month"
                aria-label="Kies maand"
                value={`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split("-").map(Number);
                  if (year && month) setCursor(new Date(year, month - 1, 1));
                }}
              />
            )}
            {view !== "Maand" && (
              <strong>
                {view === "Jaar"
                  ? cursor.getFullYear()
                  : `${MN[startMonth]} ${cursor.getFullYear()}`}
              </strong>
            )}
            <button onClick={() => shift(1)}>→</button>
          </div>
        )}
      </nav>

      <div className="filters">
        <button
          className={hidden.length ? "filter" : "filter selected"}
          onClick={() => setHidden([])}
        >
          Alles
        </button>
        {activities.map(([id, activity]) => (
          <button
            className={hidden.includes(id) ? "filter" : "filter selected"}
            onClick={() =>
              setHidden((h) =>
                h.includes(id) ? h.filter((x) => x !== id) : [...h, id],
              )
            }
            key={id}
          >
            <i className={activity.color} />
            {activity.title}
          </button>
        ))}
      </div>

      {view === "Lijst" ? (
        <ListView events={byDate} select={setSelected} />
      ) : view === "Week" ? (
        <Week cursor={cursor} events={byDate} select={setSelected} />
      ) : (
        <section className={months > 1 ? "year-view" : "calendar month"}>
          {Array.from({ length: months }, (_, i) => (
            <Month
              key={i}
              year={cursor.getFullYear()}
              month={startMonth + i}
              events={byDate}
              select={setSelected}
              newActivity={openNewActivity}
              compact={months > 1}
            />
          ))}
        </section>
      )}

      {selected && (
        <aside className="panel">
          <button className="close" onClick={() => setSelected()}>
            <X />
          </button>
          <p className="eyebrow">DATUMOPTIE</p>
          <h2>{selected.title}</h2>
          {selected.isConfirmed && (
            <div className="status-banner confirmed">
              <Check size={16} />
              <div>
                <strong>Definitief gekozen moment!</strong>
                <p>De knoop is doorgehakt voor deze activiteit.</p>
              </div>
            </div>
          )}
          {selected.isDismissed && (
            <div className="status-banner dismissed">
              <div>
                <strong>Niet gekozen moment</strong>
                <p>Er is al een ander moment definitief gekozen voor deze activiteit.</p>
              </div>
            </div>
          )}
          <p className="detail">
            <CalendarDays size={16} />
            {selected.date} · {selected.time}
          </p>
          <p className="detail">
            <MapPin size={16} />
            {selected.place}
          </p>
          <div className="vote">
            <p>Kun je op dit moment?</p>
            <button
              className={selected.mine === "in" ? "yes chosen" : "yes"}
              onClick={() => vote("in")}
            >
              In
            </button>
            <button
              className={selected.mine === "out" ? "no chosen" : "no"}
              onClick={() => vote("out")}
            >
              Out
            </button>
            <button
              className={selected.mine === "maybe" ? "maybe chosen" : "maybe"}
              onClick={() => vote("maybe")}
            >
              Misschien
            </button>
          </div>
          <div className="attendance-section">
            <div className="attendance-group">
              <div className="attendance-header">
                <span>In</span>
                <span className="attendance-badge in">{selected.ins.length}</span>
              </div>
              <div className="voter-list">
                {selected.ins.length > 0 ? (
                  selected.ins.map((v) => (
                    <span
                      key={v.userId}
                      className={`voter-pill ${v.isMe ? "me" : ""}`}
                    >
                      {v.name}
                    </span>
                  ))
                ) : (
                  <span className="voter-empty">Nog niemand heeft &apos;in&apos; gestemd</span>
                )}
              </div>
            </div>

            <div className="attendance-group">
              <div className="attendance-header">
                <span>Misschien</span>
                <span className="attendance-badge maybe">{selected.maybes.length}</span>
              </div>
              <div className="voter-list">
                {selected.maybes.length > 0 ? (
                  selected.maybes.map((v) => (
                    <span
                      key={v.userId}
                      className={`voter-pill maybe ${v.isMe ? "me" : ""}`}
                    >
                      {v.name}
                    </span>
                  ))
                ) : (
                  <span className="voter-empty">Nog niemand twijfelt</span>
                )}
              </div>
            </div>

            <div className="attendance-group">
              <div className="attendance-header">
                <span>Out</span>
                <span className="attendance-badge out">{selected.outs.length}</span>
              </div>
              <div className="voter-list">
                {selected.outs.length > 0 ? (
                  selected.outs.map((v) => (
                    <span
                      key={v.userId}
                      className={`voter-pill out ${v.isMe ? "me" : ""}`}
                    >
                      {v.name}
                    </span>
                  ))
                ) : (
                  <span className="voter-empty">Niemand afgemeld</span>
                )}
              </div>
            </div>
          </div>
          {(group?.role === "owner" || selected.createdBy === session?.user?.id) && (
            <div className="confirm-section">
              {selected.isConfirmed ? (
                <button
                  type="button"
                  className="unconfirm-button"
                  disabled={busy}
                  onClick={() => unconfirmOption(selected.id)}
                >
                  Definitief maken ongedaan maken
                </button>
              ) : (
                <button
                  type="button"
                  className="confirm-button"
                  disabled={busy}
                  onClick={() => confirmOption(selected.id, selected.optionId)}
                >
                  <Check size={16} />
                  {selected.isDismissed ? "Wijzig naar dit moment" : "Dit moment definitief maken"}
                </button>
              )}
            </div>
          )}
          <div className="location-section">
            <p className="eyebrow">LOCATIE & SUGGESTIES</p>
            {suggestions.length > 0 && (
              <div className="suggestions-list">
                <span className="suggestions-heading">Alternatieven van de groep:</span>
                {suggestions.map((s) => {
                  const isMe = s.user_id === session?.user?.id;
                  const voterName = s.profiles?.display_name || (isMe ? "Jij" : "Groepslid");
                  const canApply =
                    group?.role === "owner" || selected.createdBy === session?.user?.id;

                  return (
                    <div key={s.id} className="suggestion-item">
                      <div className="suggestion-info">
                        <span className="suggestion-label">{s.label}</span>
                        <span className="suggestion-by">Door {voterName}</span>
                      </div>
                      {canApply && selected.place !== s.label && (
                        <button
                          type="button"
                          className="use-location-btn"
                          title="Instellen als definitieve locatie"
                          onClick={() => applySuggestedLocation(selected.id, s.label)}
                        >
                          Kiezen
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <form onSubmit={addLocation} className="location-form">
              <label>
                Andere locatie voorstellen
                <div className="location-input-row">
                  <input
                    name="location"
                    placeholder="Bijv. Strandtent Zuid of Park"
                    required
                  />
                  <button className="primary" disabled={busy}>
                    Voorstellen
                  </button>
                </div>
              </label>
            </form>
          </div>
        </aside>
      )}

      {modal && (
        <div className="modal-backdrop">
          <form className="new-event" onSubmit={add}>
            <button
              type="button"
              className="close"
              onClick={() => setModal(false)}
            >
              <X />
            </button>
            <p className="eyebrow">
              NIEUWE ACTIVITEIT · {activities.length + 1}/7
            </p>
            <h2>Wat gaan jullie doen?</h2>
            <label>
              Titel
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Voorkeurslocatie
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Optioneel"
              />
            </label>
            <label>Kleur</label>
            <div className="color-picker">
              {[
                "coral",
                "purple",
                "yellow",
                "green",
                "blue",
                "pink",
                "orange",
              ].map((c) => (
                <button
                  type="button"
                  aria-label={c}
                  className={`color-choice ${c} ${form.color === c ? "chosen" : ""}`}
                  onClick={() => setForm({ ...form, color: c })}
                  key={c}
                />
              ))}
            </div>
            <label>Mogelijke momenten</label>
            {form.options.map((o, i) => (
              <div className="form-row" key={i}>
                <input
                  required
                  type="date"
                  value={o.date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      options: form.options.map((x, j) =>
                        j === i ? { ...x, date: e.target.value } : x,
                      ),
                    })
                  }
                />
                <input
                  required
                  type="time"
                  value={o.time}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      options: form.options.map((x, j) =>
                        j === i ? { ...x, time: e.target.value } : x,
                      ),
                    })
                  }
                />
                {form.options.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        options: form.options.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, options: [...form.options, emptyOption()] })
              }
            >
              + Nog een moment
            </button>
            <button
              className="primary"
              disabled={busy || activities.length >= 7}
            >
              Opslaan
            </button>
          </form>
        </div>
      )}

      {shareModal && group && (
        <div className="modal-backdrop">
          <div className="new-event share-modal">
            <button
              type="button"
              className="close"
              onClick={() => setShareModal(false)}
            >
              <X />
            </button>
            <p className="eyebrow">GROEP DELEN</p>
            <h2>Nodig anderen uit</h2>
            <p className="subtle">
              Iedereen met deze link kan direct de agenda bekijken en stemmen zonder een account aan te maken.
            </p>
            <div className="share-link-box">
              <input
                readOnly
                value={getShareUrl()}
                className="share-link-input"
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className={`copy-btn ${copied ? "copied" : ""}`}
                onClick={copyShareLink}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? "Gekopieerd!" : "Kopiëren"}</span>
              </button>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hoi! Wanneer zien we elkaar? Stem mee in de InOfOut groepsagenda van ${group.name}: ${getShareUrl()}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn"
            >
              <MessageCircle size={17} />
              Deel direct via WhatsApp
            </a>
            <p className="share-hint">
              💡 Deel de link in jullie groepsapp zodat iedereen kan aangeven wie &quot;In&quot; of &quot;Out&quot; is.
            </p>
          </div>
        </div>
      )}

      {joinInvite && (
        <div className="modal-backdrop">
          <form className="new-event join-modal" onSubmit={handleJoin}>
            <p className="eyebrow">UITNODIGING</p>
            <h2>Meedoen met {joinInvite.preview?.name || "de groep"}</h2>
            <p className="subtle">
              Vul je naam in om de datumopties te bekijken en direct aan te geven wanneer je kunt.
            </p>
            <label>
              Jouw naam
              <input
                required
                name="name"
                placeholder="Bijv. Sarah of Lars"
                autoFocus
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Deelnemen…" : "Deelnemen aan groep"}
            </button>
          </form>
        </div>
      )}

      {renaming && (
        <div className="modal-backdrop">
          <form className="new-event rename-group" onSubmit={renameGroup}>
            <button
              type="button"
              className="close"
              onClick={() => setRenaming(false)}
            >
              <X />
            </button>
            <p className="eyebrow">GROEPSINSTELLINGEN</p>
            <h2>Groepsnaam wijzigen</h2>
            <label>
              Naam
              <input
                required
                name="groupName"
                defaultValue={group?.name}
                maxLength={80}
                autoFocus
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Opslaan…" : "Naam opslaan"}
            </button>
          </form>
        </div>
      )}

      {groupPicker && (
        <div className="modal-backdrop">
          {newGroup ? (
            <form className="new-event group-picker" onSubmit={start}>
              <button type="button" className="close" onClick={() => setNewGroup(false)}>
                <X />
              </button>
              <p className="eyebrow">NIEUWE GROEP</p>
              <h2>Voor wie is deze agenda?</h2>
              <label>Jouw naam<input required name="name" autoFocus /></label>
              <label>Groepsnaam<input required name="group" placeholder="Bijv. Familie" maxLength={80} /></label>
              <button className="primary" disabled={busy}>{busy ? "Groep maken…" : "Groep maken"}</button>
            </form>
          ) : (
            <div className="new-event group-picker">
              <button type="button" className="close" onClick={() => setGroupPicker(false)}><X /></button>
              <p className="eyebrow">JOUW GROEPEN</p>
              <h2>Kies een agenda</h2>
              <div className="group-list">
                {groups.map((candidate) => (
                  <button
                    type="button"
                    key={candidate.id}
                    className={`group-choice ${candidate.id === group?.id ? "active" : ""}`}
                    disabled={busy}
                    onClick={async () => {
                      if (candidate.id === group?.id) return setGroupPicker(false);
                      setBusy(true);
                      try {
                        setGroup(candidate);
                        setSelected(undefined);
                        setHidden([]);
                        await load(candidate, session);
                        setGroupPicker(false);
                      } catch (e) {
                        setError(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <span>{candidate.name}</span>
                    {candidate.id === group?.id && <span>Actief</span>}
                  </button>
                ))}
              </div>
              <button type="button" className="primary" onClick={() => setNewGroup(true)}>
                <Plus size={17} /> Nieuwe groep
              </button>
              {group?.role === "owner" && (
                <button type="button" className="group-rename-link" onClick={() => { setGroupPicker(false); setRenaming(true); }}>
                  Naam van deze groep wijzigen
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {onboard && (
        <div className="modal-backdrop">
          <form className="new-event" onSubmit={start}>
            <h2>Maak je eerste groep</h2>
            <label>
              Jouw naam
              <input required name="name" />
            </label>
            <label>
              Groepsnaam
              <input required name="group" />
            </label>
            <button className="primary" disabled={busy}>
              Groep maken
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="connection-error">
          {error}
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  );
}

function Month({ year, month, events, select, newActivity, compact }) {
  let first = new Date(year, month, 1),
    off = (first.getDay() + 6) % 7,
    cells = Array.from({ length: 42 }, (_, i) => {
      let d = new Date(year, month, 1 - off + i);
      return d;
    });
  let grid = (
    <>
      {WD.map((d) => (
        <div className="weekday" key={d}>
          {d}
        </div>
      ))}
      {cells.map((d) => (
        <div
          className={`day ${d.getMonth() !== month ? "outside" : ""} ${d.getDay() === 0 || d.getDay() === 6 ? "weekend" : ""}`}
          key={dk(d)}
          role={d.getMonth() === month ? "button" : undefined}
          tabIndex={d.getMonth() === month ? 0 : undefined}
          onClick={() => d.getMonth() === month && newActivity(d)}
          onKeyDown={(event) => {
            if (d.getMonth() === month && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              newActivity(d);
            }
          }}
        >
          {d.getDay() === 1 && <span className="week-number">W{isoWeek(d)}</span>}
          <span className="date">{d.getDate()}</span>
          {(events[dk(d)] || []).map((e) => (
            <button
              className={`event ${e.color} ${e.isConfirmed ? "confirmed" : ""} ${e.isDismissed ? "dismissed" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                select(e);
              }}
              key={e.optionId}
              title={e.isConfirmed ? "Definitief gekozen" : e.isDismissed ? "Vervallen optie" : ""}
            >
              {compact ? (
                "•"
              ) : (
                <>
                  {e.isConfirmed && <span className="confirmed-mark">✓ </span>}
                  {e.time} {e.title}
                  {e.isDismissed && <span className="dismissed-tag"> (vervallen)</span>}
                </>
              )}
            </button>
          ))}
        </div>
      ))}
    </>
  );
  return compact ? (
    <div className="mini-month">
      <h3>{MN[month]}</h3>
      <div className="calendar">{grid}</div>
    </div>
  ) : (
    grid
  );
}

function Week({ cursor, events, select }) {
  let m = new Date(cursor);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return (
    <section className="week-view">
      <div className="week-view-number">Week {isoWeek(m)}</div>
      {Array.from({ length: 7 }, (_, i) => {
        let d = new Date(m);
        d.setDate(m.getDate() + i);
        return (
          <div className="week-day" key={dk(d)}>
            <p>
              {WD[i]} <b>{d.getDate()}</b>
            </p>
            {(events[dk(d)] || []).map((e) => (
              <button
                className={`week-event ${e.color} ${e.isConfirmed ? "confirmed" : ""} ${e.isDismissed ? "dismissed" : ""}`}
                onClick={() => select(e)}
                key={e.optionId}
                title={e.isConfirmed ? "Definitief gekozen" : e.isDismissed ? "Vervallen optie" : ""}
              >
                {e.isConfirmed && <span className="confirmed-badge">Definitief ✓</span>}
                {e.time}
                <br />
                {e.title}
                {e.isDismissed && <span className="dismissed-note">Vervallen</span>}
              </button>
            ))}
          </div>
        );
      })}
    </section>
  );
}

function ListView({ events, select }) {
  const sortedDates = useMemo(() => {
    return Object.keys(events).sort((a, b) => a.localeCompare(b));
  }, [events]);

  if (!sortedDates.length) {
    return (
      <div className="list-empty">
        <p>Geen activiteiten of datumopties gevonden.</p>
        <span>Klik op &apos;Nieuwe activiteit&apos; om momenten toe te voegen.</span>
      </div>
    );
  }

  return (
    <section className="list-view">
      {sortedDates.map((dateStr) => {
        const dateObj = new Date(dateStr + "T00:00:00");
        const dayName = dateObj.toLocaleDateString("nl-NL", { weekday: "long" });
        const formattedDate = dateObj.toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const dayEvents = events[dateStr] || [];

        return (
          <div className="list-day-group" key={dateStr}>
            <div className="list-day-header">
              <span className="list-day-name">{dayName}</span>
              <span className="list-day-date">{formattedDate}</span>
              <span className="list-week-number">W{isoWeek(dateObj)}</span>
            </div>
            <div className="list-cards-container">
              {dayEvents.map((e) => (
                <div
                  key={e.optionId}
                  className={`list-card ${e.color} ${e.isConfirmed ? "confirmed" : ""} ${e.isDismissed ? "dismissed" : ""}`}
                  onClick={() => select(e)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="list-card-content">
                    <div className="list-card-top">
                      <span className="list-card-time">{e.time}</span>
                      <h3 className="list-card-title">{e.title}</h3>
                      {e.isConfirmed && (
                        <span className="confirmed-badge">Definitief ✓</span>
                      )}
                      {e.isDismissed && (
                        <span className="dismissed-tag">Vervallen</span>
                      )}
                    </div>
                    <div className="list-card-bottom">
                      <span className="list-card-place">
                        <MapPin size={13} />
                        {e.place}
                      </span>
                      <div className="list-card-voting">
                        <span className="attendance-badge in">{e.ins.length} in</span>
                        <span className="attendance-badge maybe">{e.maybes.length} misschien</span>
                        <span className="attendance-badge out">{e.outs.length} out</span>
                        {e.mine === "in" && (
                          <span className="voter-pill me">Jij: In</span>
                        )}
                        {e.mine === "out" && (
                          <span className="voter-pill out">Jij: Out</span>
                        )}
                        {e.mine === "maybe" && (
                          <span className="voter-pill maybe">Jij: Misschien</span>
                        )}
                        {!e.mine && !e.isDismissed && (
                          <span className="voter-pill stem-prompt">Stemmen</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
