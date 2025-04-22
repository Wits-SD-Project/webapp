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
      let matching = Array.from(firestoreData.entries())
        .filter(([, data]) => {
          if (!data) return false;
          const fieldValue = data[field];
          if (field.endsWith('_lower')) {
            return fieldValue === value.toLowerCase();
          }
          return fieldValue === value;
        })
        
        .map(([id, data]) => ({ 
          id, 
          data: () => data,
          ref: makeDocRef(id)
        }));

      return {
        where: function(newField, newOp, newValue) {
          matching = matching.filter(({ data }) => {
            const docData = data();
            if (newField.endsWith('_lower')) {
              return docData[newField] === newValue.toLowerCase();
            }
            return docData[newField] === newValue;
          });
          return this;
        },
        limit: (n) => ({
          get: jest.fn(() => Promise.resolve({
            empty: matching.length === 0,
            docs: matching.slice(0, n),
          })),
        }),
        get: jest.fn(() => Promise.resolve({
          empty: matching.length === 0,
          docs: matching,
          forEach: function(fn) {
            matching.forEach(fn);
          }
        })),
      };
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
        forEach: function(fn) {
          docs.forEach(fn);
        }
      });
    }),
  };
}

// In __mocks__/firebase.js
async function runTransaction(updateFunction) {
  try {
    return await updateFunction({
      get: async (query) => {
        if (query.where && query.collection) {
          const matching = Array.from(firestoreData.entries())
            .filter(([id, data]) => {
              return query.where.every(([field, op, value]) => {
                if (field.endsWith('_lower')) {
                  return data[field] === value.toLowerCase();
                }
                return data[field] === value;
              });
            })
            .map(([id, data]) => ({
              id,
              data: () => data,
              exists: true
            }));

          return {
            empty: matching.length === 0,
            docs: matching
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