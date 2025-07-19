import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Order } from '../lib/supabase';
import notificationService from '../lib/notificationService';
import toast from 'react-hot-toast';

interface AssignedDish {
  orderId: string;
  dishName: string;
  tableNumber: number;
  status: string;
  customerName: string;
  assignedWaiterId?: string;
  cookStatus: string;
}

interface Cook {
  id: string;
  full_name: string;
  role: string;
  restaurant_id: string;
}

// Utility functions for notified tasks
const getNotifiedTasks = (staffId: string) => {
  const key = `notifiedTasks-${staffId}-cook`;
  const stored = localStorage.getItem(key);
  return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
};

const addNotifiedTask = (staffId: string, taskKey: string) => {
  const key = `notifiedTasks-${staffId}-cook`;
  const notified = getNotifiedTasks(staffId);
  notified.add(taskKey);
  localStorage.setItem(key, JSON.stringify(Array.from(notified)));
};

const CookDashboard: React.FC = () => {
  const [cookName, setCookName] = useState('');
  const [assignedDishes, setAssignedDishes] = useState<AssignedDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [cookRole, setCookRole] = useState('');
  const [updatingDish, setUpdatingDish] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isNotificationServiceReady, setIsNotificationServiceReady] = useState(false);

  useEffect(() => {
    let cook: Cook | null = null;
    const staff = sessionStorage.getItem('staff');
    if (staff) {
      cook = JSON.parse(staff);
      if (cook) {
        setCookName(cook.full_name);
        setCookRole(cook.role || '');
        
        // Initialize notification service
        initializeNotificationService();
        // Request notification permission automatically
        notificationService.requestPermission().then(setNotificationPermission);
        
        fetchAssignedDishes(cook);
        // --- Realtime subscription for orders ---
        const channel = supabase
          .channel('cook-orders-realtime')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `restaurant_id=eq.${cook.restaurant_id}`
            },
            (payload) => {
              if (cook) {
                fetchAssignedDishes(cook);
              }
            }
          )
          .subscribe();
        return () => {
          channel.unsubscribe();
        };
      }
    } else {
      navigate('/staff-login');
    }
  }, [navigate]);

  const initializeNotificationService = async () => {
    try {
      const success = await notificationService.initialize();
      setIsNotificationServiceReady(success);
      setNotificationPermission(notificationService.getPermission());
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await notificationService.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Notifications enabled! You will receive alerts for new tasks.', {
          duration: 4000,
          position: 'top-center'
        });
      } else if (permission === 'denied') {
        toast.error('Notifications disabled. You can still see alerts in the app.', {
          duration: 4000,
          position: 'top-center'
        });
      }
    } catch (err) {
      toast.error('Could not request notification permission. Alerts will show in the app.', {
        duration: 4000,
        position: 'top-center'
      });
    }
  };

  const showNotification = async (orderId: string, tableNumber: number) => {
    const success = await notificationService.showCookNotification(orderId, tableNumber);
    if (!success) {
      // Fallback: show toast notification
      toast.success(`👨‍🍳 New dish assigned! Order #${orderId}, Table ${tableNumber}`, {
        duration: 5000,
        position: 'top-center'
      });
    }
  };

  const fetchAssignedDishes = async (cook: Cook) => {
    setLoading(true);
    setError('');
    try {
      // Get all orders for the cook's restaurant
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', cook.restaurant_id);
      if (ordersError) throw ordersError;
      
      // Flatten all assigned dishes for this cook using id (UUID)
      const assigned: AssignedDish[] = [];
      const newTasks: { taskKey: string; dish: AssignedDish }[] = [];
      
      // Use localStorage for notified tasks
      const notified = getNotifiedTasks(cook.id);
      
      for (const order of orders) {
        for (const item of order.items) {
          if (item.assigned_cook_id === cook.id) {
            const assignedDish: AssignedDish = {
              orderId: order.id,
              dishName: item.name,
              tableNumber: order.table_number,
              status: order.status,
              customerName: order.customer_name,
              assignedWaiterId: item.assigned_waiter_id,
              cookStatus: item.cook_status,
            };
            
            assigned.push(assignedDish);
            
            // Check if this is a new task that hasn't been notified yet
            const taskKey = `${order.id}-${item.name}`;
            if (!notified.has(taskKey) && (!item.cook_status || item.cook_status === 'pending')) {
              newTasks.push({ taskKey, dish: assignedDish });
              addNotifiedTask(cook.id, taskKey);
            }
          }
        }
      }
      
      setAssignedDishes(assigned);
      
      // Show notifications for new tasks
      newTasks.forEach(({ dish }) => {
        showNotification(dish.orderId, dish.tableNumber);
      });
      
    } catch (err: any) {
      setError('Failed to load assigned dishes.');
    } finally {
      setLoading(false);
    }
  };

  const updateDishStatus = async (orderId: string, dishName: string, nextStatus: string) => {
    setUpdatingDish(dishName);
    try {
      // Fetch the order
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (fetchError || !order) throw fetchError || new Error('Order not found');
      // Update the relevant dish in the items array
      const updatedItems = order.items.map((item: any) =>
        item.name === dishName ? { ...item, cook_status: nextStatus } : item
      );
      let updatePayload: any = { items: updatedItems };
      // If starting to prepare and order is pending, also update order status
      if (nextStatus === 'preparing' && order.status === 'pending') {
        updatePayload.status = 'preparing';
      }
      // If marking as completed, check if all dishes are completed, then set order status to 'ready'
      if (nextStatus === 'completed') {
        const allCompleted = updatedItems.every((item: any) => item.cook_status === 'completed');
        if (allCompleted) {
          updatePayload.status = 'ready';
        }
      }
      // Update the order row
      const { error: updateError, data: updateData } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select();
      if (updateError) {
        toast.error('Failed to update status');
      } else {
        toast.success('Status updated!');
      }
      // Refresh assigned dishes
      const staff = sessionStorage.getItem('staff');
      if (staff) fetchAssignedDishes(JSON.parse(staff));
    } catch (err: any) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingDish(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('staff');
    navigate('/staff-login');
  };

  const testNotificationSystem = async () => {
    const deviceInfo = notificationService.getDeviceInfo();
    console.log('Device Info:', deviceInfo);
    
    const success = await notificationService.showTestNotification();
    if (success) {
      toast.success('Test notification sent!');
    } else {
      toast.error('Failed to send test notification');
    }
  };

  return (
    <div className="p-8">
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Welcome {cookRole ? cookRole.charAt(0).toUpperCase() + cookRole.slice(1) : ''}{cookName && `, ${cookName}`}</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${notificationPermission === 'granted' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={notificationPermission === 'granted' ? 'text-green-600' : 'text-red-600'}>
              {notificationService.isMobile() ? 'Mobile: Browser + App Alerts' : 'Desktop: Browser + App Alerts'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Assigned Cooking Tasks</h2>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : assignedDishes.filter(dish => dish.cookStatus !== 'completed').length === 0 ? (
          <p className="text-gray-600">No assigned cooking tasks at the moment.</p>
        ) : (
          <table className="min-w-full text-sm mt-2">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Dish</th>
                <th className="px-4 py-2 text-left">Table</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {assignedDishes.filter(dish => dish.cookStatus !== 'completed').map((dish, idx) => (
                <tr key={dish.orderId + '-' + idx} className="border-b">
                  <td className="px-4 py-2">{dish.dishName}</td>
                  <td className="px-4 py-2">{dish.tableNumber}</td>
                  <td className="px-4 py-2">{dish.customerName}</td>
                  <td className="px-4 py-2 capitalize">{dish.cookStatus || 'pending'}</td>
                  <td className="px-4 py-2">
                    {(!dish.cookStatus || dish.cookStatus === 'pending') && (
                      <button onClick={() => updateDishStatus(dish.orderId, dish.dishName, 'preparing')} className="bg-blue-600 text-white px-2 py-1 rounded text-xs" disabled={updatingDish === dish.dishName}>Start Preparing</button>
                    )}
                    {dish.cookStatus === 'preparing' && (
                      <button onClick={() => updateDishStatus(dish.orderId, dish.dishName, 'completed')} className="bg-green-600 text-white px-2 py-1 rounded text-xs" disabled={updatingDish === dish.dishName}>Mark Completed</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {/* Completed Cooking Tasks Section */}
        <h2 className="text-xl font-semibold mt-8 mb-2">Completed Cooking Tasks</h2>
        {assignedDishes.filter(dish => dish.cookStatus === 'completed').length === 0 ? (
          <p className="text-gray-600">No completed cooking tasks yet.</p>
        ) : (
          <table className="min-w-full text-sm mt-2">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Dish</th>
                <th className="px-4 py-2 text-left">Table</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignedDishes.filter(dish => dish.cookStatus === 'completed').map((dish, idx) => (
                <tr key={dish.orderId + '-' + idx} className="border-b bg-gray-50">
                  <td className="px-4 py-2">{dish.dishName}</td>
                  <td className="px-4 py-2">{dish.tableNumber}</td>
                  <td className="px-4 py-2">{dish.customerName}</td>
                  <td className="px-4 py-2 capitalize">Completed</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CookDashboard; 