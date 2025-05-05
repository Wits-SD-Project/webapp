// __mocks__/firebase.js
const firestoreData = new Map();

const authMethods = {
  verifyIdToken: jest.fn((token) => {
    if (token === "valid-token") {
      return Promise.resolve({ uid: "12345", email: "test@example.com", name: "Test User" });
    }
    const err = new Error("Invalid token");
    err.code = "auth/argument-error";
    return Promise.reject(err);
  }),
  setCustomUserClaims: jest.fn(() => Promise.resolve()),
  createSessionCookie: jest.fn(() => Promise.resolve("mocked-session-cookie")),
};

function makeDocRef(id) {
  return {
    id,
    get: jest.fn(() => {
      const data = firestoreData.get(id);
      return Promise.resolve({ 
        exists: !!data, 
        data: () => data,
        ref: { id } 
      });
    }),
    set: jest.fn((data) => {
      firestoreData.set(id, data);
      return Promise.resolve();
    }),
    update: jest.fn((updates) => {
      const existing = firestoreData.get(id) || {};
      firestoreData.set(id, { ...existing, ...updates });
      return Promise.resolve();
    }),
    delete: jest.fn(() => {
      firestoreData.delete(id);
      return Promise.resolve();
    })
  };
}

function makeCollection(collName) {
  return {
    doc: (id) => makeDocRef(id),

    add: jest.fn((data) => {
      const id = `${collName}_${Math.random().toString(36).substring(2, 15)}`;
      firestoreData.set(id, data);
      return Promise.resolve(makeDocRef(id));
    }),

    where: function(field, op, value) {
      let matching = Array.from(firestoreData.entries())
        .filter(([, data]) => data?.[field] === value)
        .map(([id, data]) => ({
          id,
          data: () => data,
          ref: makeDocRef(id)
        }));

      const query = {
        where: (...args) => query, // allow chaining
        orderBy: (...args) => query,
        limit: (n) => ({
          get: jest.fn(() =>
            Promise.resolve({
              docs: matching.slice(0, n),
              empty: matching.length === 0,
              forEach: (fn) => matching.slice(0, n).forEach(fn),
            })
          ),
        }),
        get: jest.fn(() =>
          Promise.resolve({
            docs: matching,
            empty: matching.length === 0,
            forEach: (fn) => matching.forEach(fn),
          })
        ),
      };
      return query;
    },

    orderBy: function (field, direction = "asc") {
      const docs = Array.from(firestoreData.entries())
        .map(([id, data]) => ({
          id,
          data: () => data,
          ref: makeDocRef(id),
        }))
        .sort((a, b) => {
          const aVal = a.data()[field];
          const bVal = b.data()[field];
          if (aVal < bVal) return direction === "desc" ? 1 : -1;
          if (aVal > bVal) return direction === "desc" ? -1 : 1;
          return 0;
        });

      return {
        get: jest.fn(() =>
          Promise.resolve({
            docs,
            empty: docs.length === 0,
            forEach: (fn) => docs.forEach(fn),
          })
        ),
        where: (...args) => this.where(...args),
        limit: (n) => ({
          get: jest.fn(() =>
            Promise.resolve({
              docs: docs.slice(0, n),
              empty: docs.length === 0,
              forEach: (fn) => docs.slice(0, n).forEach(fn),
            })
          ),
        }),
      };
    },

    get: jest.fn(() => {
      const docs = Array.from(firestoreData.entries()).map(([id, data]) => ({
        id,
        data: () => data,
        ref: makeDocRef(id),
      }));
      return Promise.resolve({
        docs,
        forEach: (fn) => docs.forEach(fn),
      });
    }),
  };
}

// In __mocks__/firebase.js
async function runTransaction(updateFunction) {
  try {
    return await updateFunction({
      get: async (query) => {
        if (query._getMatching) {
          const docs = query._getMatching();
          return {
            empty: docs.length === 0,
            docs
          };
        }

        // fallback: ID-based get
        const data = firestoreData.get(query.id);
        return { exists: !!data, data: () => data };
      },
      create: (ref, data) => {
        firestoreData.set(ref.id, data);
      }
    });
  } catch (error) {
    throw error;
  }
}


function batch() {
  const ops = [];
  return {
    set: (ref, data) => ops.push(["set", ref.id, data]),
    delete: (ref) => ops.push(["delete", ref.id]),
    commit: jest.fn(() => {
      ops.forEach(([op, id, data]) => {
        if (op === "set") firestoreData.set(id, data);
        if (op === "delete") firestoreData.delete(id);
      });
      return Promise.resolve();
    }),
  };
}

function firestore() {
  return {
    collection: (name) => makeCollection(name),
    runTransaction: jest.fn((fn) => runTransaction(fn)),
    batch,
    FieldValue: {
      serverTimestamp: jest.fn(() => new Date()),
    },
  };
}

firestore.FieldValue = {
  serverTimestamp: jest.fn(() => new Date()),
  arrayUnion: jest.fn((...elements) => elements)
};

module.exports = {
  admin: {
    auth: () => authMethods,
    firestore,
    __firestoreData: firestoreData,
  },
};