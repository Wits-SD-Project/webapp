import { useEffect, useState, useCallback } from 'react';
import Sidebar from '../../components/StaffSideBar.js';
import '../../styles/staffViewBookings.css';

import {
  addDoc,
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebase';

export default function ViewBookings() {
  const [bookings, setBookings]   = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  /* ───── helper: fetch bookings for the signed-in staff member ───── */
  const fetchBookings = useCallback(async (uid) => {
    if (!uid) return;
    const snap = await getDocs(
      query(collection(db, 'bookings'), where('facilityStaff', '==', uid))
    );
    setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, []);

  /* refresh when auth state changes */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => fetchBookings(u?.uid));
    return unsub;
  }, [fetchBookings]);

  /* weight for a stable sort: pending → approved → rejected */
  const weight = (s) => ({ pending: 0, approved: 1, rejected: 2 }[s] ?? 3);

  /* ─────────── approve / reject handler (now keyed by id) ─────────── */
  const updateBookingStatus = async (bookingId, newStatus) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    try {
      /* 1. update booking doc */
      await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus });

      /* 2. push notification */
      await addDoc(collection(db, 'notifications'), {
        userName    : booking.userName ?? booking.user ?? 'Unknown',
        facilityName: booking.facilityName,
        status      : newStatus,
        slot        : booking.slot ?? booking.datetime ?? '',
        createdAt   : serverTimestamp(),
        read        : false,
      });

      /* 3. if approved → mark slot as booked */
      if (newStatus === 'approved') {
        const facSnap = await getDocs(
          query(
            collection(db, 'facilities-test'),
            where('name', '==', booking.facilityName)
          )
        );
        const facDoc = facSnap.docs[0];
        if (facDoc) {
          const facRef  = facDoc.ref;
          const facData = facDoc.data();
          const updatedSlots = (facData.timeslots ?? []).map((s) =>
            `${s.start} - ${s.end}` === booking.slot
              ? { ...s, isBooked: true, bookedBy: booking.userName ?? booking.user ?? 'Unknown' }
              : s
          );
          await updateDoc(facRef, { timeslots: updatedSlots });
        }
      }

      /* 4. update UI */
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    } catch (err) {
      console.error('updateBookingStatus error:', err); // eslint-disable-line no-console
    }
  };

  return (
    <main className="view-bookings">
      <div className="container">
        <Sidebar activeItem="view bookings" />

        <main className="main-content">
          <header className="page-header">
            <h1>View Bookings</h1>
            <input
              type="search"
              placeholder="Search"
              className="search-box"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </header>

          <section className="table-section">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {[...bookings]
                  .filter((b) => {
                    const q = searchQuery.toLowerCase();
                    return (
                      (b.facilityName ?? '').toLowerCase().includes(q) ||
                      (b.userName ?? b.user ?? '').toLowerCase().includes(q) ||
                      (b.date ? b.date.toString() : '').toLowerCase().includes(q) ||
                      (b.slot ?? '').toLowerCase().includes(q) ||
                      (b.status ?? '').toLowerCase().includes(q)
                    );
                  })
                  .sort((a, b) => weight(a.status) - weight(b.status))
                  .map((b) => (
                    <tr key={b.id}>
                      <td>{b.facilityName}</td>
                      <td>{b.userName ?? b.user ?? '—'}</td>
                      <td>{b.date ?? '—'}</td>
                      <td>{b.slot ?? '—'}</td>
                      <td className={`status ${b.status?.toLowerCase()}`}>{b.status}</td>
                      <td className="actions">
                        {b.status === 'pending' ? (
                          <>
                            <button
                              className="approve"
                              onClick={() => updateBookingStatus(b.id, 'approved')}
                            >
                              Approve
                            </button>
                            <button
                              className="reject"
                              onClick={() => updateBookingStatus(b.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <button className="view">View</button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </main>
  );
}
