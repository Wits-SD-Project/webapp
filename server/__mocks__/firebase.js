const firestoreData = new Map();

// Helper methods
firestoreData.setCollection = (collectionName, docs) => {
  docs.forEach(doc => {
    const key = `${collectionName}/${doc.id}`;
    firestoreData.set(key, doc);
  });
};

firestoreData.setDoc = (collectionName, docId, docData) => {
  const key = `${collectionName}/${docId}`;
  firestoreData.set(key, docData);
};

// Auth methods
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

// Document reference
function makeDocRef(id, collName = null) {
  const fullKey = collName ? `${collName}/${id}` : id;

  return {
    id,
    get: jest.fn(() => {
      const data = firestoreData.get(fullKey) ?? firestoreData.get(id);
      return Promise.resolve({ 
        exists: !!data, 
        data: () => data,
        ref: { id }
      });
    }),
    set: jest.fn((data) => {
      firestoreData.set(fullKey, data);
      return Promise.resolve();
    }),
    update: jest.fn((updates) => {
      const existing = firestoreData.get(fullKey) ?? firestoreData.get(id) ?? {};
      firestoreData.set(fullKey, { ...existing, ...updates });
      return Promise.resolve();
    }),
    delete: jest.fn(() => {
      firestoreData.delete(fullKey);
      return Promise.resolve();
    }),
    collection: jest.fn((subColl) => makeCollection(`${collName}/${id}/${subColl}`)),
    _collection: collName,
  };
}

// Collection implementation
function makeCollection(collName) {
  return {
    doc: (id) => makeDocRef(id, collName),
    where: function(field, op, value) {
      let filters = [[field, op, value]];
      let orderByField = null;
      let orderDirection = 'asc';
      let limitCount = null;

      const query = {
        _collection: collName,
        _filters: filters,
        where: function(newField, newOp, newValue) {
          filters.push([newField, newOp, newValue]);
          return this;
        },
        orderBy: function(field, direction = 'asc') {
          orderByField = field;
          orderDirection = direction;
          return this;
        },
        limit: function(n) {
          limitCount = n;
          return this;
        },
        get: jest.fn(() => {
          let matching = Array.from(firestoreData.entries())
            .filter(([key]) => key.startsWith(`${collName}/`))
            .map(([key, data]) => ({
              id: key.split('/')[1],
              data: () => data,
              ref: makeDocRef(key.split('/')[1], collName)
            }))
            .filter(({ data }) => {
              const docData = data();
              return filters.every(([field, op, value]) => {
                if (!(field in docData)) return false;
                if (op === '==') return docData[field] === value;
                if (op === '<') return docData[field] < value;
                if (op === '>') return docData[field] > value;
                if (op === '<=') return docData[field] <= value;
                if (op === '>=') return docData[field] >= value;
                return true;
              });
            });

          if (orderByField) {
            matching.sort((a, b) => {
              const aVal = a.data()[orderByField];
              const bVal = b.data()[orderByField];
              if (aVal < bVal) return orderDirection === 'asc' ? -1 : 1;
              if (aVal > bVal) return orderDirection === 'asc' ? 1 : -1;
              return 0;
            });
          }

          if (limitCount) {
            matching = matching.slice(0, limitCount);
          }

          return Promise.resolve({
            empty: matching.length === 0,
            docs: matching,
            forEach: (fn) => matching.forEach(fn)
          });
        })
      };
      return query;
    },
    get: jest.fn(() => {
      const docs = Array.from(firestoreData.entries())
        .filter(([key]) => key.startsWith(`${collName}/`))
        .map(([key, data]) => ({
          id: key.split('/')[1],
          data: () => data,
          ref: makeDocRef(key.split('/')[1], collName)
        }));
      return Promise.resolve({ 
        docs,
        forEach: (fn) => docs.forEach(fn)
      });
    }),
    add: jest.fn((data) => {
      const newId = `mock_${Math.random().toString(36).substr(2, 9)}`;
      const key = `${collName}/${newId}`;
      firestoreData.set(key, data);
      return Promise.resolve({
        id: newId,
        path: key,
        set: (newData) => {
          firestoreData.set(key, newData);
          return Promise.resolve();
        }
      });
    })
  };
}

// Transaction and batch
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
        const key = query._collection ? `${query._collection}/${query.id}` : query.id;
        const data = firestoreData.get(key) ?? firestoreData.get(query.id);
        return { exists: !!data, data: () => data };
      },
      create: (ref, data) => {
        const key = ref._collection ? `${ref._collection}/${ref.id}` : ref.id;
        firestoreData.set(key, data);
      }
    });
  } catch (error) {
    throw error;
  }
}

function batch() {
  const ops = [];
  return {
    set: (ref, data) => ops.push(["set", ref._collection, ref.id, data]),
    delete: (ref) => ops.push(["delete", ref._collection, ref.id]),
    commit: jest.fn(() => {
      ops.forEach(([op, coll, id, data]) => {
        const key = coll ? `${coll}/${id}` : id;
        if (op === "set") firestoreData.set(key, data);
        if (op === "delete") firestoreData.delete(key);
      });
      return Promise.resolve();
    }),
  };
}

// Firestore service
function firestore() {
  return {
    collection: (name) => makeCollection(name),
    runTransaction: jest.fn((fn) => runTransaction(fn)),
    batch,
    FieldValue: {
      serverTimestamp: jest.fn(() => new Date()),
      arrayUnion: jest.fn((...elements) => elements),
      arrayRemove: jest.fn((...elements) => elements),
      increment: jest.fn((n) => n)
    },
  };
}

// Admin SDK
module.exports = {
  admin: {
    auth: () => authMethods,
    firestore,
    __firestoreData: firestoreData,
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn()
    }
  },
};