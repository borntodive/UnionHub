import { w as a } from "./index-DFehVeka.js";
const n = {
    getContracts: async () => (await a.get("/contracts")).data,
    createContract: async (e) => (await a.post("/contracts", e)).data,
    updateContract: async (e, s) => (await a.put(`/contracts/${e}`, s)).data,
    deleteContract: async (e) => {
      await a.delete(`/contracts/${e}`);
    },
  },
  c = {
    getGrades: async () => (await a.get("/grades")).data,
    createGrade: async (e) => (await a.post("/grades", e)).data,
    updateGrade: async (e, s) => (await a.put(`/grades/${e}`, s)).data,
    deleteGrade: async (e) => {
      await a.delete(`/grades/${e}`);
    },
  },
  i = {
    getBases: async () => (await a.get("/bases")).data,
    createBase: async (e) => (await a.post("/bases", e)).data,
    updateBase: async (e, s) => (await a.put(`/bases/${e}`, s)).data,
    deleteBase: async (e) => {
      await a.delete(`/bases/${e}`);
    },
  },
  o = {
    getCategories: async (e) =>
      (await a.get("/issue-categories", { params: e ? { ruolo: e } : void 0 }))
        .data,
    createCategory: async (e) => (await a.post("/issue-categories", e)).data,
    updateCategory: async (e, s) =>
      (await a.put(`/issue-categories/${e}`, s)).data,
    deleteCategory: async (e) => {
      await a.delete(`/issue-categories/${e}`);
    },
  },
  d = {
    getUrgencies: async () => (await a.get("/issue-urgencies")).data,
    createUrgency: async (e) => (await a.post("/issue-urgencies", e)).data,
    updateUrgency: async (e, s) =>
      (await a.put(`/issue-urgencies/${e}`, s)).data,
    deleteUrgency: async (e) => {
      await a.delete(`/issue-urgencies/${e}`);
    },
  };
export { d as a, i as b, n as c, c as g, o as i };
