import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../lib/firebase.js';

// Firebase Collection Helper
const createEntity = (collectionName) => {
  return {
    // Get all documents
    getAll: async () => {
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const docs = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const docId = doc.id;

          // Log para debug - mostrar se o ID do documento é diferente do campo 'id' nos dados
          if (data.id && data.id !== docId) {
            console.log(`⚠️ [${collectionName}.getAll] Documento com ID divergente:`, {
              firestoreDocId: docId,
              dataFieldId: data.id,
              name: data.name || data.commercial_name
            });
          }

          // IMPORTANTE: Colocar id: docId DEPOIS do spread para garantir que o ID do Firestore seja usado
          return { ...data, id: docId };
        });
        return docs;
      } catch (error) {
        // Rethrow the error so calling code can handle it
        throw new Error(`Failed to load data from ${collectionName}: ${error.message}`);
      }
    },

    // Alias for getAll (for compatibility)
    list: async () => {
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));

        const docs = querySnapshot.docs.map(doc => {
          // IMPORTANTE: Colocar id: doc.id DEPOIS do spread para garantir que o ID do Firestore seja usado
          const data = { ...doc.data(), id: doc.id };
          return data;
        });

        return docs;
      } catch (error) {
        // Rethrow the error so calling code can handle it
        throw new Error(`Failed to list data from ${collectionName}: ${error.message}`);
      }
    },

    // Get document by ID
    getById: async (id) => {
      const startTime = Date.now();

      console.log(`🔵 [${collectionName}.getById] INÍCIO - Buscando documento com ID:`, id);
      console.log(`🔵 [${collectionName}.getById] Tipo do ID:`, typeof id);
      console.log(`🔵 [${collectionName}.getById] Tamanho do ID:`, id?.length);
      console.log(`🔵 [${collectionName}.getById] ID em hex:`, Buffer.from(id || '', 'utf8').toString('hex'));

      try {
        // Handle temporary customer IDs for portal
        if (collectionName === 'Customer' && id?.startsWith('temp-')) {
          console.log(`🔵 [${collectionName}.getById] ID temporário detectado, retornando mock`);
          return {
            id: id,
            name: 'Novo Cliente',
            active: false,
            pending_registration: true,
            category: 'temp',
            blocked: false,
            suspended: false
          };
        }

        console.log(`🔵 [${collectionName}.getById] Criando referência do documento...`);
        const docRef = doc(db, collectionName, id);
        console.log(`🔵 [${collectionName}.getById] Referência criada:`, docRef.path);

        // Add timeout wrapper for Firestore operations
        console.log(`🔵 [${collectionName}.getById] Buscando documento no Firestore...`);
        const docSnapPromise = getDoc(docRef);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 8000)
        );

        const docSnap = await Promise.race([docSnapPromise, timeoutPromise]);
        console.log(`🔵 [${collectionName}.getById] Documento existe?`, docSnap.exists());

        if (docSnap.exists()) {
          console.log(`✅ [${collectionName}.getById] Documento ENCONTRADO:`, docSnap.id);
          console.log(`✅ [${collectionName}.getById] Dados:`, docSnap.data());
        } else {
          console.log(`❌ [${collectionName}.getById] Documento NÃO EXISTE no Firestore`);
        }

        const result = docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } : null;
        
        const queryTime = Date.now() - startTime;
        if (queryTime > 1000) {
          console.warn(`[${collectionName}.getById] Slow query: ${queryTime}ms for ID: ${id}`);
        }
        
        return result;
      } catch (error) {
        const queryTime = Date.now() - startTime;
        console.error(`[${collectionName}.getById] Error after ${queryTime}ms:`, error.message);
        
        if (error.message === 'Firestore timeout') {
          throw new Error(`Request timed out after ${queryTime}ms. Please try again.`);
        }
        throw new Error(`Failed to get document ${id} from ${collectionName}: ${error.message}`);
      }
    },

    // Alias for getById (for compatibility)
    get: function(id) {
      return this.getById(id);
    },

    // Create new document
    create: async (data) => {
      // 🚨 LOG ANTES DA CRIAÇÃO
      const currentTime = new Date();
      const dayOfWeek = currentTime.getDay();
      const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayOfWeek];
      
      console.log(`🆕 [${collectionName.toUpperCase()}.CREATE] Iniciando criação:`, {
        collection: collectionName,
        timestamp: currentTime.toISOString(),
        dayOfWeek: dayOfWeek,
        dayName: dayName,
        isFriday: dayOfWeek === 5,
        dataSize: JSON.stringify(data).length,
        customerName: data.customer_name || 'N/A',
        customerId: data.customer_id || 'N/A',
        date: data.date || 'N/A'
      });
      
      const startTime = Date.now();
      
      try {
        const docData = {
          ...data,
          createdAt: currentTime,
          updatedAt: currentTime
        };
        
        const docRef = await addDoc(collection(db, collectionName), docData);
        
        const createTime = Date.now() - startTime;
        console.log(`✅ [${collectionName.toUpperCase()}.CREATE] Sucesso:`, {
          id: docRef.id,
          createTime: `${createTime}ms`,
          isFriday: dayOfWeek === 5,
          collection: collectionName
        });
        
        return { ...docData, id: docRef.id };
      } catch (error) {
        const errorTime = Date.now() - startTime;
        console.error(`❌ [${collectionName.toUpperCase()}.CREATE] Erro:`, {
          error: error.message,
          code: error.code,
          stack: error.stack,
          collection: collectionName,
          errorTime: `${errorTime}ms`,
          dayOfWeek: dayOfWeek,
          dayName: dayName,
          isFriday: dayOfWeek === 5,
          customerName: data.customer_name || 'N/A',
          customerId: data.customer_id || 'N/A'
        });
        throw error;
      }
    },

    // Create new document with a specific ID
    createWithId: async (id, data) => {
      const docRef = doc(db, collectionName, id);
      const docData = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await setDoc(docRef, docData);
      return { id, ...docData };
    },

    // Update document
    update: async (id, data) => {
      // 🚨 LOG ANTES DA ATUALIZAÇÃO
      const currentTime = new Date();
      const dayOfWeek = currentTime.getDay();
      const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayOfWeek];
      
      console.log(`🔄 [${collectionName.toUpperCase()}.UPDATE] Iniciando atualização:`, {
        collection: collectionName,
        id: id,
        timestamp: currentTime.toISOString(),
        dayOfWeek: dayOfWeek,
        dayName: dayName,
        isFriday: dayOfWeek === 5,
        dataSize: JSON.stringify(data).length,
        customerName: data.customer_name || 'N/A',
        customerId: data.customer_id || 'N/A',
        date: data.date || 'N/A'
      });
      
      const startTime = Date.now();
      
      try {
        const docRef = doc(db, collectionName, id);
        const updateData = {
          ...data,
          updatedAt: currentTime
        };
        
        await updateDoc(docRef, updateData);
        
        const updateTime = Date.now() - startTime;
        console.log(`✅ [${collectionName.toUpperCase()}.UPDATE] Sucesso:`, {
          id: id,
          updateTime: `${updateTime}ms`,
          isFriday: dayOfWeek === 5,
          collection: collectionName
        });
        
        return { id, ...updateData };
      } catch (error) {
        const errorTime = Date.now() - startTime;
        console.error(`❌ [${collectionName.toUpperCase()}.UPDATE] Erro:`, {
          error: error.message,
          code: error.code,
          stack: error.stack,
          collection: collectionName,
          id: id,
          errorTime: `${errorTime}ms`,
          dayOfWeek: dayOfWeek,
          dayName: dayName,
          isFriday: dayOfWeek === 5,
          customerName: data.customer_name || 'N/A',
          customerId: data.customer_id || 'N/A'
        });
        throw error;
      }
    },

    // Delete document
    delete: async (id) => {
      try {
        const docRef = doc(db, collectionName, id);
        
        // Verificar se o documento existe antes de deletar
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          // Retornar sucesso se já foi excluído (idempotente)
          return { id, deleted: true, alreadyDeleted: true };
        }
        
        await deleteDoc(docRef);
        
        // Verificar se realmente foi deletado
        const verifyDoc = await getDoc(docRef);
        if (verifyDoc.exists()) {
          throw new Error(`Document was not deleted successfully`);
        }
        
        return { id, deleted: true };
      } catch (error) {
        throw new Error(`Failed to delete document ${id} from ${collectionName}: ${error.message}`);
      }
    },

    // Query with filters
    query: async (filters = [], orderByField = null, limitCount = null) => {
      try {
        let q = collection(db, collectionName);

        if (filters.length > 0) {
          const constraints = filters.map(filter => where(filter.field, filter.operator, filter.value));
          q = query(q, ...constraints);
        }

        if (orderByField) {
          q = query(q, orderBy(orderByField));
        }

        if (limitCount) {
          q = query(q, limit(limitCount));
        }

        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        return docs;
      } catch (error) {
        throw new Error(`Failed to query ${collectionName}: ${error.message}`);
      }
    },

    // Listen to real-time updates
    listen: (callback, filters = [], orderByField = null, limitCount = null) => {
      try {
        let q = collection(db, collectionName);

        if (filters.length > 0) {
          const constraints = filters.map(filter => where(filter.field, filter.operator, filter.value));
          q = query(q, ...constraints);
        }

        if (orderByField) {
          q = query(q, orderBy(orderByField));
        }

        if (limitCount) {
          q = query(q, limit(limitCount));
        }

        // Subscribe to real-time updates
        const unsubscribe = onSnapshot(
          q,
          (querySnapshot) => {
            const docs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            callback(docs);
          },
          (error) => {
            console.error(`[${collectionName}.listen] Error:`, error);
            callback(null, error);
          }
        );

        // Return unsubscribe function
        return unsubscribe;
      } catch (error) {
        console.error(`[${collectionName}.listen] Setup error:`, error);
        throw new Error(`Failed to setup listener for ${collectionName}: ${error.message}`);
      }
    }
  };
};

// Export all entities using exact Firebase collection names
export const BillPayment = createEntity('BillPayment');
export const Brand = createEntity('Brand');
export const Category = createEntity('Category');
export const CategoryTree = createEntity('CategoryTree');
export const CategoryType = createEntity('CategoryType');
export const Customer = createEntity('Customer');
export const Ingredient = createEntity('Ingredient');
export const MenuCategory = createEntity('MenuCategory');
export const MenuConfig = createEntity('MenuConfig');
export const MenuLocation = createEntity('MenuLocation');
export const MenuNote = createEntity('MenuNote');
export const NutritionCategory = createEntity('NutritionCategory');
export const NutritionFood = createEntity('NutritionFood');
export const Order = createEntity('Order');
export const OrderReceiving = createEntity('OrderReceiving');
export const OrderWaste = createEntity('OrderWaste');
export const PriceHistory = createEntity('PriceHistory');
export const Recipe = createEntity('Recipe');
export const RecipeIngredient = createEntity('RecipeIngredient');
export const RecipeNutritionConfig = createEntity('RecipeNutritionConfig');
export const RecipeProcess = createEntity('RecipeProcess');
export const RecurringBill = createEntity('RecurringBill');
export const Supplier = createEntity('Supplier');
export const UserNutrientConfig = createEntity('UserNutrientConfig');
export const VariableBill = createEntity('VariableBill');
export const WeeklyMenu = createEntity('WeeklyMenu');
export const AppSettings = createEntity('AppSettings');

// User entity
export const UserEntity = createEntity('User');

// Auth with User methods
import { auth } from '../../lib/firebase.js';

export const User = {
  ...auth,
  
  // Create user with specific ID
  createWithId: async (userId, userData) => {
    try {
      const newUserData = {
        id: userId,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = doc(db, 'User', userId);
      await setDoc(docRef, newUserData);
      
      return { id: userId, ...newUserData };
    } catch (error) {
      throw new Error('Falha ao criar usuário: ' + error.message);
    }
  },
  
  // Get current user data - No authentication required
  me: async () => {
    return new Promise((resolve, reject) => {
      // Return mock user data for development without authentication
      resolve({
        id: 'mock-user-id',
        email: 'dev@cozinhaafeto.com',
        displayName: 'Usuário de Desenvolvimento',
        photoURL: null
      });
    });
  },

  // Get user data - Load from Firestore
  getMyUserData: async () => {
    try {
      const userId = 'mock-user-id'; // Em produção, pegar do usuário autenticado
      
      const userData = await UserEntity.getById(userId);
      return userData;
    } catch (error) {
      return null;
    }
  },

  // Update user data - Save to Firestore
  updateMyUserData: async (userData) => {
    try {
      const userId = 'mock-user-id'; // Em produção, pegar do usuário autenticado
      
      
      // Primeiro, tenta buscar o usuário existente
      let existingUser = null;
      try {
        existingUser = await UserEntity.getById(userId);
      } catch (error) {
      }
      
      if (existingUser) {
        // Se existe, atualiza usando update
        const updatedData = {
          ...existingUser,
          ...userData,
          updatedAt: new Date()
        };
        await UserEntity.update(userId, updatedData);
      } else {
        // Se não existe, cria usando setDoc com o ID específico
        const newUserData = {
          id: userId,
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Usar setDoc ao invés de create para especificar o ID
        const docRef = doc(db, 'User', userId);
        await setDoc(docRef, newUserData);
      }
      
      return {
        success: true,
        message: 'Dados do usuário salvos com sucesso no Firestore'
      };
    } catch (error) {
      throw new Error('Falha ao salvar configurações: ' + error.message);
    }
  }
};