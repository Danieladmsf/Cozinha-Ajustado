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
  limit 
} from 'firebase/firestore';
import { db } from '../../lib/firebase.js';

// Firebase Collection Helper
const createEntity = (collectionName) => {
  return {
    // Get all documents
    getAll: async () => {
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
          const data = { id: doc.id, ...doc.data() };
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
      try {
        // Handle temporary customer IDs for portal
        if (collectionName === 'Customer' && id?.startsWith('temp-')) {
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
        
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        const result = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        return result;
      } catch (error) {
        throw new Error(`Failed to get document ${id} from ${collectionName}: ${error.message}`);
      }
    },

    // Alias for getById (for compatibility)
    get: function(id) {
      return this.getById(id);
    },

    // Create new document
    create: async (data) => {
      const docData = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const docRef = await addDoc(collection(db, collectionName), docData);
      return { id: docRef.id, ...docData };
    },

    // Update document
    update: async (id, data) => {
      const docRef = doc(db, collectionName, id);
      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      await updateDoc(docRef, updateData);
      return { id, ...updateData };
    },

    // Delete document
    delete: async (id) => {
      try {
        console.log(`[${collectionName}] Tentando deletar documento ID:`, id);
        const docRef = doc(db, collectionName, id);
        
        // Verificar se o documento existe antes de deletar
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          console.warn(`[${collectionName}] Documento ${id} já foi excluído anteriormente`);
          // Retornar sucesso se já foi excluído (idempotente)
          return { id, deleted: true, alreadyDeleted: true };
        }
        
        console.log(`[${collectionName}] Documento encontrado, procedendo com exclusão:`, docSnapshot.data());
        await deleteDoc(docRef);
        
        // Verificar se realmente foi deletado
        const verifyDoc = await getDoc(docRef);
        if (verifyDoc.exists()) {
          console.error(`[${collectionName}] ERRO: Documento ainda existe após exclusão!`);
          throw new Error(`Document was not deleted successfully`);
        }
        
        console.log(`[${collectionName}] ✅ Documento deletado e verificado com sucesso:`, id);
        return { id, deleted: true };
      } catch (error) {
        console.error(`[${collectionName}] Erro ao deletar documento:`, error);
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
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return docs;
      } catch (error) {
        throw new Error(`Failed to query ${collectionName}: ${error.message}`);
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