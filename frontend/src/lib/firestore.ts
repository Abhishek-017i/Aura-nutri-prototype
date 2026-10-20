import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { app } from './firebase'

const db = getFirestore(app)

export async function getUserDoc(uid: string) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}
