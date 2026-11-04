import { apiFetch } from "./client";

// Přihlášení a registrace.
export const loginApi = (payload) =>
  apiFetch("/api/auth/login", { method: "POST", body: payload, auth: false });

export const registerApi = (payload) =>
  apiFetch("/api/auth/registrace", { method: "POST", body: payload, auth: false });

// Vytváření, kontrola a úpravy lekcí.
export const getLessonsApi = () => apiFetch("/api/lekce");

export const createLessonApi = (payload) =>
  apiFetch("/api/lekce/vytvor", { method: "POST", body: payload });

export const getLessonEditorOptionsApi = () => apiFetch("/api/lekce/nastaveni");

export const getLessonEditorApi = (lessonId) => apiFetch(`/api/lekce/${lessonId}/editor`);

export const saveLessonDraftApi = (lessonId, payload) =>
  apiFetch(`/api/lekce/${lessonId}/navrh`, { method: "PUT", body: payload });

export const reopenLessonApi = (lessonId, version) =>
  apiFetch(`/api/lekce/${lessonId}/odemknout`, { method: "POST", body: { version } });

export const copyLessonApi = (lessonId) =>
  apiFetch(`/api/lekce/${lessonId}/kopie`, { method: "POST" });

export const proposeLessonQuestionsApi = (lessonId, payload) =>
  apiFetch(`/api/lekce/${lessonId}/navrh-otazek`, { method: "POST", body: payload });

export const getLessonPdfApi = (lessonId, { solution = false, material = "none" } = {}) =>
  apiFetch(`/api/lekce/${lessonId}/pdf?solution=${solution ? "1" : "0"}&material=${encodeURIComponent(material)}`, { responseType: "blob" });

export const getLessonDetailApi = (lessonId) =>
  apiFetch(`/api/lekce/${lessonId}/detail`);

export const updateLessonApi = (lessonId, payload) =>
  apiFetch(`/api/lekce/${lessonId}`, { method: "PUT", body: payload });

export const approveLessonApi = (lessonId) =>
  apiFetch(`/api/lekce/schval/${lessonId}`, { method: "POST" });

export const deleteLessonApi = (lessonId) =>
  apiFetch(`/api/lekce/${lessonId}`, { method: "DELETE" });

// Úpravy otázek před schválením lekce.
export const updateQuestionApi = (questionId, payload) =>
  apiFetch(`/api/otazky/${questionId}`, { method: "PUT", body: payload });

export const deleteQuestionApi = (questionId) =>
  apiFetch(`/api/otazky/${questionId}`, { method: "DELETE" });

// Přiřazování žáků a povolování opakování.
export const getTeacherStudentsApi = (query = "") =>
  apiFetch(`/api/ucitel/studenti?query=${encodeURIComponent(query)}`);

export const getLessonAssignmentsApi = (lessonId) =>
  apiFetch(`/api/lekce/${lessonId}/prirazeni`);

export const saveLessonAssignmentsApi = (lessonId, studentIds) =>
  apiFetch(`/api/lekce/${lessonId}/prirazeni`, {
    method: "POST",
    body: { studentIds },
  });

export const getLessonStudentsOverviewApi = (lessonId) =>
  apiFetch(`/api/lekce/${lessonId}/prehled-zaku`);

export const addStudentsToLessonApi = (lessonId, studentIds) =>
  apiFetch(`/api/lekce/${lessonId}/pridat-zaky`, {
    method: "POST",
    body: { studentIds },
  });

export const allowLessonRepeatBatchApi = (lessonId, studentIds) =>
  apiFetch("/api/test-admin/povolit-opakovani-hromadne", {
    method: "POST",
    body: { lessonId, studentIds },
  });

// Studentský pokus, další otázka a odeslání odpovědi.
export const startAttemptApi = (lessonId) =>
  apiFetch(`/api/test/${lessonId}/start`, { method: "POST", body: {} });

export const getNextQuestionApi = (lessonId) =>
  apiFetch(`/api/test/${lessonId}/next`);

export const sendAnswerApi = (payload) =>
  apiFetch("/api/odpoved", { method: "POST", body: payload });

export const finishAttemptApi = (lessonId) =>
  apiFetch(`/api/test/${lessonId}/finish`, { method: "POST", body: {} });

// Učitelské statistiky.
export const getTeacherOverviewApi = () =>
  apiFetch("/api/statistiky/ucitel/prehled");

export const getTeacherLessonStatsApi = (lessonId) =>
  apiFetch(`/api/statistiky/ucitel/lekce/${lessonId}`);

export const getAttemptAnswersApi = (lessonId, attemptId) =>
  apiFetch(`/api/statistiky/ucitel/lekce/${lessonId}/pokus/${attemptId}`);

// Učitelské složky pro třídění lekcí.
export const getLessonGroupsApi = () => apiFetch("/api/skupiny");
export const createLessonGroupApi = (payload) => apiFetch("/api/skupiny", { method: "POST", body: payload });
export const updateLessonGroupApi = (id, payload) => apiFetch(`/api/skupiny/${id}`, { method: "PUT", body: payload });
export const deleteLessonGroupApi = (id) => apiFetch(`/api/skupiny/${id}`, { method: "DELETE" });
export const moveLessonToGroupApi = (id, groupId) => apiFetch(`/api/skupiny/lekce/${id}`, { method: "PUT", body: { groupId } });

// Samostatná spuštění testů s připojením přes QR.
export const getTestSessionsApi = (lessonId) => apiFetch(`/api/qr${lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : ""}`);
export const createTestSessionApi = (lessonId) => apiFetch("/api/qr", { method: "POST", body: { lessonId } });
export const getTestSessionApi = (id) => apiFetch(`/api/qr/${id}`);
export const getTestSessionQrApi = (id, origin) => apiFetch(`/api/qr/${id}/qr?origin=${encodeURIComponent(origin)}`, { responseType: "blob" });
export const startTestSessionApi = (id) => apiFetch(`/api/qr/${id}/start`, { method: "POST" });
export const closeTestSessionApi = (id) => apiFetch(`/api/qr/${id}/close`, { method: "POST" });
export const deleteTestSessionApi = (id) => apiFetch(`/api/qr/${id}`, { method: "DELETE" });
export const removeTestParticipantApi = (id, participantId) => apiFetch(`/api/qr/${id}/participants/${participantId}`, { method: "DELETE" });
export const getTestParticipantAnswersApi = (id, participantId) => apiFetch(`/api/qr/${id}/participants/${participantId}`);
export const getPublicTestSessionApi = (code) => apiFetch(`/api/qr/join/${encodeURIComponent(code)}`, { auth: false });
export const joinTestSessionApi = (code, name) => apiFetch(`/api/qr/join/${encodeURIComponent(code)}`, { method: "POST", body: { name }, auth: false });
const guestOptions = (token) => ({ auth: false, headers: { Authorization: `Bearer ${token}` } });
export const getGuestStatusApi = (token) => apiFetch("/api/qr/guest/status", guestOptions(token));
export const getGuestQuestionApi = (token) => apiFetch("/api/qr/guest/next", guestOptions(token));
export const sendGuestAnswerApi = (token, questionId, answer) => apiFetch("/api/qr/guest/answer", { ...guestOptions(token), method: "POST", body: { questionId, answer } });
export const leaveTestSessionApi = (token) => apiFetch("/api/qr/guest", { ...guestOptions(token), method: "DELETE" });
