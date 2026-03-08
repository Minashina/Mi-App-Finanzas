import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export default function TourGuide() {
    useEffect(() => {
        // Verificar si el tour ya se completó anteriormente
        const tourCompleted = localStorage.getItem('finanzas_tour_completed');
        
        if (!tourCompleted) {
            const driverObj = driver({
                showProgress: true,
                allowClose: false, // Forzar a que terminen o salten con los botones
                doneBtnText: '¡Entendido!',
                closeBtnText: 'Saltar',
                nextBtnText: 'Siguiente',
                prevBtnText: 'Anterior',
                progressText: 'Paso {{current}} de {{total}}',
                onDestroyStarted: () => {
                    if (!driverObj.hasNextStep() || confirm("¿Seguro que quieres saltar el tutorial?")) {
                        localStorage.setItem('finanzas_tour_completed', 'true');
                        driverObj.destroy();
                    }
                },
                onPopoverRender: (popover, { config, state }) => {
                    // Personalización básica de los botones
                    const btnContainer = popover.footer?.querySelector('.driver-popover-navigation-btns');
                    if (btnContainer) {
                        const btns = btnContainer.querySelectorAll('button');
                        btns.forEach(btn => {
                            btn.style.borderRadius = '8px';
                            btn.style.padding = '8px 16px';
                            btn.style.fontSize = '14px';
                            btn.style.fontWeight = 'bold';
                        });
                        
                        const nextBtn = btnContainer.querySelector('.driver-popover-next-btn');
                        if (nextBtn) {
                            nextBtn.style.backgroundColor = '#8b5cf6'; // Color primario
                            nextBtn.style.color = 'white';
                            nextBtn.style.border = 'none';
                        }
                    }
                },
                steps: [
                    {
                        popover: {
                            title: '¡Bienvenido a Finanzas V5! 👋',
                            description: 'Esta app te ayudará a llevar un control preciso de tus gatos, tarjetas de crédito, deudas a meses sin intereses y ahorros de manera muy sencilla.',
                            side: "over",
                            align: 'center'
                        }
                    },
                    {
                        element: '#tour-sidebar',
                        popover: {
                            title: 'Navegación Principal',
                            description: 'Desde aquí puedes acceder a todas las secciones: registrar gastos fijos, ver tu historial, consultar deudas MSI y organizar tus cuentas de débito o crédito.',
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: '#tour-balance',
                        popover: {
                            title: 'Saldo Real Disponible',
                            description: 'Este es el dinero "líquido" que tienes. Se calcula sumando tus cuentas de débito y efectivo, y le resta la cuota mensual de tus compras a MSI y otros gastos de tarjeta.',
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#tour-topay',
                        popover: {
                            title: 'A Pagar este Mes',
                            description: 'Tu principal indicador de peligro 🚨. Suma lo que te falta por pagar de gastos fijos este mes, más las cuotas de meses sin intereses (MSI) y el saldo pendiente de tus tarjetas de crédito.',
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#tour-credit',
                        popover: {
                            title: 'Deuda de Tarjetas de Crédito',
                            description: 'Aquí verás cuánto debes en total en todas tus tarjetas de crédito juntas. ¡Mantenla baja para evitar intereses!',
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#tour-msi',
                        popover: {
                            title: 'Deudas a Meses Sin Intereses',
                            description: 'Muestra tu deuda total comprometida a meses sin intereses. Te ayuda a saber si te estás sobreendeudando a futuro.',
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#tour-savings',
                        popover: {
                            title: 'Tus Ahorros',
                            description: 'El total de dinero que tienes guardado de forma segura en tus metas de ahorro.',
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#tour-fab',
                        popover: {
                            title: '¡Registra un Gasto!',
                            description: 'Usa este botón rápido (o el menú) para registrar ingresos, gastos o transferencias. ¡Empieza a tomar el control de tus finanzas!',
                            side: "top",
                            align: 'end'
                        }
                    }
                ]
            });

            // Pequeño retraso para asegurar que el DOM cargó (especialmente animaciones)
            setTimeout(() => {
                driverObj.drive();
            }, 500);
        }
    }, []);

    return null; // Componente sin render visual, solo ejecuta lógica
}
