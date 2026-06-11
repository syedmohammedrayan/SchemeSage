import admin from 'firebase-admin';
import crypto from 'crypto';
import { db } from '../config/db.js';

// Generic Firestore Wrapper mimicking Mongoose Model APIs
class FirestoreWrapper {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  // Builds a Firestore query ref from a Mongoose-like query object
  private getQueryRef(query: any = {}) {
    let ref: any = db.collection(this.collectionName);
    for (const [key, value] of Object.entries(query)) {
      if (value && typeof value === 'object') {
        const valObj = value as any;
        if ('$ne' in valObj) {
          ref = ref.where(key, '!=', valObj['$ne']);
        } else if ('$in' in valObj) {
          ref = ref.where(key, 'in', valObj['$in']);
        }
      } else {
        ref = ref.where(key, '==', value);
      }
    }
    return ref;
  }

  // Mimics: Model.find(query).sort(sort).limit(limit)
  find(query: any = {}) {
    const ref = this.getQueryRef(query);
    let sortField: string | null = null;
    let sortDir: 'asc' | 'desc' = 'asc';
    let limitVal: number | null = null;

    const chain = {
      sort: (sortObj: any) => {
        const key = Object.keys(sortObj)[0];
        sortField = key;
        sortDir = sortObj[key] === -1 ? 'desc' : 'asc';
        return chain;
      },
      limit: (l: number) => {
        limitVal = l;
        return chain;
      },
      then: async (resolve: any, reject: any) => {
        try {
          const snapshot = await ref.get();
          let results: any[] = [];
          snapshot.forEach((doc: any) => {
            results.push({ 
              ...doc.data(), 
              _id: doc.id,
              toObject: function() { return this; }
            });
          });

          // In-memory sort to prevent Firestore from silently dropping documents missing the sort field
          if (sortField) {
            results.sort((a, b) => {
              const valA = a[sortField!];
              const valB = b[sortField!];
              if (valA === valB) return 0;
              // Push missing fields to the end
              if (valA == null) return 1;
              if (valB == null) return -1;
              const cmp = valA > valB ? 1 : -1;
              return sortDir === 'desc' ? -cmp : cmp;
            });
          }

          if (limitVal !== null) {
            results = results.slice(0, limitVal);
          }

          resolve(results);
        } catch (err) {
          console.error(`[Firestore Find Error: ${this.collectionName}]`, err);
          reject(err);
        }
      }
    };
    return chain as any;
  }

  // Mimics: Model.findOne(query)
  async findOne(query: any = {}) {
    try {
      const ref = this.getQueryRef(query);
      const snapshot = await ref.limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return {
        ...doc.data(),
        _id: doc.id,
        toObject: function() { return this; }
      };
    } catch (err) {
      console.error(`[Firestore findOne Error: ${this.collectionName}]`, err);
      return null;
    }
  }

  // Mimics: Model.create(data)
  async create(data: any) {
    try {
      if (Array.isArray(data)) {
        return this.insertMany(data);
      }

      const id = data.id || data._id || crypto.randomUUID();
      const docData = { ...data, id };
      const now = new Date().toISOString();
      if (!docData.timestamp) docData.timestamp = now;
      if (!docData.createdAt) docData.createdAt = now;
      // Remove any undefined values which Firestore throws on and convert Dates
      Object.keys(docData).forEach(key => {
        if (docData[key] === undefined) {
          delete docData[key];
        } else if (docData[key] instanceof Date) {
          docData[key] = docData[key].toISOString();
        }
      });
      
      await db.collection(this.collectionName).doc(id).set(docData);
      return {
        ...docData,
        _id: id,
        toObject: function() { return this; }
      };
    } catch (err) {
      console.error(`[Firestore create Error: ${this.collectionName}]`, err);
      throw err;
    }
  }

  // Mimics batch/many insertion: Model.insertMany(data)
  async insertMany(dataArray: any[]) {
    try {
      const results = [];
      const batch = db.batch();
      for (const item of dataArray) {
        const id = item.id || item._id || crypto.randomUUID();
        const docData = { ...item, id };
        const now = new Date().toISOString();
        if (!docData.timestamp) docData.timestamp = now;
        if (!docData.createdAt) docData.createdAt = now;
        
        // Remove undefined and convert Dates
        Object.keys(docData).forEach(key => {
          if (docData[key] === undefined) {
            delete docData[key];
          } else if (docData[key] instanceof Date) {
            docData[key] = docData[key].toISOString();
          }
        });

        const docRef = db.collection(this.collectionName).doc(id);
        batch.set(docRef, docData);
        results.push({ 
          ...docData, 
          _id: id, 
          toObject: function() { return this; } 
        });
      }
      await batch.commit();
      return results;
    } catch (err) {
      console.error(`[Firestore insertMany Error: ${this.collectionName}]`, err);
      throw err;
    }
  }

  // Mimics: Model.findOneAndUpdate(query, update, options)
  async findOneAndUpdate(query: any, update: any, options: any = {}) {
    try {
      let updateData = { ...update };
      let incData: any = null;
      let setOnInsertData: any = null;

      if ('$set' in update) {
        updateData = { ...update['$set'] };
      } else {
        delete updateData['$setOnInsert'];
        delete updateData['$inc'];
      }

      if ('$setOnInsert' in update) {
        setOnInsertData = update['$setOnInsert'];
      }
      if ('$inc' in update) {
        incData = update['$inc'];
      }

      // Remove undefined values and convert Dates
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        } else if (updateData[key] instanceof Date) {
          updateData[key] = updateData[key].toISOString();
        }
      });

      const doc = await this.findOne(query);
      if (!doc) {
        if (options.upsert) {
          const id = (setOnInsertData && setOnInsertData.id) || updateData.id || query.id || crypto.randomUUID();
          const initialData = { ...query, ...updateData, ...(setOnInsertData || {}), id };
          await db.collection(this.collectionName).doc(id).set(initialData);
          return { 
            ...initialData, 
            _id: id,
            toObject: function() { return this; } 
          };
        }
        return null;
      }

      const docId = doc._id;

      // Handle increment
      if (incData) {
        for (const [key, value] of Object.entries(incData)) {
          updateData[key] = admin.firestore.FieldValue.increment(value as number);
        }
      }

      await db.collection(this.collectionName).doc(docId).update(updateData);
      const updatedDoc = await db.collection(this.collectionName).doc(docId).get();
      return {
        ...updatedDoc.data(),
        _id: docId,
        toObject: function() { return this; }
      };
    } catch (err) {
      console.error(`[Firestore findOneAndUpdate Error: ${this.collectionName}]`, err);
      throw err;
    }
  }

  // Mimics: Model.findOneAndDelete(query)
  async findOneAndDelete(query: any) {
    try {
      const doc = await this.findOne(query);
      if (!doc) return null;
      const docId = doc.id || doc._id;
      await db.collection(this.collectionName).doc(docId).delete();
      return doc;
    } catch (err) {
      console.error(`[Firestore findOneAndDelete Error: ${this.collectionName}]`, err);
      throw err;
    }
  }

  // Mimics: Model.deleteOne(query)
  async deleteOne(query: any) {
    try {
      const doc = await this.findOne(query);
      if (!doc) return { deletedCount: 0 };
      const docId = doc.id || doc._id;
      await db.collection(this.collectionName).doc(docId).delete();
      return { deletedCount: 1 };
    } catch (err) {
      console.error(`[Firestore deleteOne Error: ${this.collectionName}]`, err);
      throw err;
    }
  }

  // Mimics: Model.updateMany(query, update)
  async updateMany(query: any, update: any) {
    try {
      let updateData = { ...update };
      if ('$set' in update) {
        updateData = update['$set'];
      }
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      const ref = this.getQueryRef(query);
      const snapshot = await ref.get();
      const batch = db.batch();
      snapshot.forEach((doc: any) => {
        batch.update(doc.ref, updateData);
      });
      await batch.commit();
      return { modifiedCount: snapshot.size };
    } catch (err) {
      console.error(`[Firestore updateMany Error: ${this.collectionName}]`, err);
      throw err;
    }
  }

  // Mimics: Model.deleteMany(query)
  async deleteMany(query: any) {
    try {
      const ref = this.getQueryRef(query);
      const snapshot = await ref.get();
      const batch = db.batch();
      snapshot.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      return { deletedCount: snapshot.size };
    } catch (err) {
      console.error(`[Firestore deleteMany Error: ${this.collectionName}]`, err);
      throw err;
    }
  }

  // Mimics: Model.countDocuments(query)
  async countDocuments(query: any = {}) {
    try {
      const ref = this.getQueryRef(query);
      const snapshot = await ref.get();
      return snapshot.size;
    } catch (err) {
      console.error(`[Firestore countDocuments Error: ${this.collectionName}]`, err);
      return 0;
    }
  }
}

// Exports wrapper classes matching the mongoose model names
export const UserModel = new FirestoreWrapper('users');
export const SchemeModel = new FirestoreWrapper('schemes');
export const SavedSchemeModel = new FirestoreWrapper('saved_schemes');
export const ApplicationModel = new FirestoreWrapper('applications');
export const NotificationModel = new FirestoreWrapper('notifications');
export const UserDocumentModel = new FirestoreWrapper('user_documents');
export const ChatMessageModel = new FirestoreWrapper('chat_messages');
export const AgentModel = new FirestoreWrapper('agents');
export const AgentRequestModel = new FirestoreWrapper('agent_requests');
export const AIAgentModel = new FirestoreWrapper('ai_agents');
export const ScrapedSchemeModel = new FirestoreWrapper('scraped_schemes');
export const AuditLogModel = new FirestoreWrapper('audit_logs');
export const ProcessedSchemeModel = new FirestoreWrapper('processed_schemes');
export const ScrapeJobModel = new FirestoreWrapper('scrape_jobs');

// MVP Ecosystem Models
export const AgentSubscriptionModel = new FirestoreWrapper('agent_subscriptions');
export const AgentWalletModel       = new FirestoreWrapper('agent_wallets');
export const CommissionModel        = new FirestoreWrapper('commissions');
export const TransactionModel       = new FirestoreWrapper('transactions');
export const WithdrawalModel        = new FirestoreWrapper('withdrawals');
export const SubscriptionPaymentModel = new FirestoreWrapper('subscription_payments');

export const connect = async () => {}; // Mock for index.ts/db.ts lifecycle triggers if any
