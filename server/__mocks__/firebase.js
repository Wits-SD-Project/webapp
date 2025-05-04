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
    where: function(field, op, value) {
      let filters = [[field, op, value]];

      let matching = Array.from(firestoreData.entries())
        .filter(([, data]) => {
          if (!data) return false;
          return data[field] === value || 
                 (field.endsWith('_lower') && data[field] === value.toLowerCase());
        })
        .map(([id, data]) => ({ 
          id, 
          data: () => data,
          ref: makeDocRef(id)
        }));

      const query = {
        _collection: collName,
        _filters: filters,
        where(newField, newOp, newValue) {
          filters.push([newField, newOp, newValue]);
          matching = matching.filter(({ data }) => {
            const docData = data();
            return docData[newField] === newValue ||
                   (newField.endsWith('_lower') && docData[newField] === newValue.toLowerCase());
          });
          return this;
        },
        limit(n) {
          return {
            ...query,
            get: jest.fn(() => Promise.resolve({
              empty: matching.length === 0,
              docs: matching.slice(0, n),
            }))
          };
        },
        get: jest.fn(() => Promise.resolve({
          empty: matching.length === 0,
          docs: matching,
          forEach(fn) { matching.forEach(fn); }
        })),
        _getMatching: () => matching,
      };

      return query;
    },
    get: jest.fn(() => {
      const docs = Array.from(firestoreData.entries())
        .map(([id, data]) => ({ 
          id, 
          data: () => data,
          ref: makeDocRef(id)
        }));
      return Promise.resolve({ 
        docs,
        forEach(fn) { docs.forEach(fn); }
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