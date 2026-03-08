import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

// Configuración base compartida
const baseConfig = {
    showProgress: true,
    allowClose: true,
    doneBtnText: '¡Entendido!',
    closeBtnText: 'Cerrar',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Anterior',
    progressText: 'Paso {{current}} de {{total}}',
    onPopoverRender: (popover) => {
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
                nextBtn.style.backgroundColor = '#8b5cf6';
                nextBtn.style.color = 'white';
                nextBtn.style.border = 'none';
            }
        }
    }
};

const tours = {
    dashboard: [
        {
            popover: {
                title: 'Resumen Mensual',
                description: 'Aquí verás un resumen rápido de cómo van tus finanzas en el mes actual.',
                align: 'center'
            }
        },
        {
            element: '#tour-balance',
            popover: {
                title: 'Saldo Real Disponible',
                description: 'El dinero líquido que tienes (débito + efectivo) menos lo que debes pagarle este mes a tus tarjetas de crédito o compras MSI.',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: '#tour-topay',
            popover: {
                title: 'A Pagar este Mes',
                description: '¡Ojo con este número! Es la suma de lo que debes pagar en el mes (Gastos Fijos restantes + Cuotas de MSI + Gastos Directos de TC).',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: '#tour-credit',
            popover: {
                title: 'Deuda Total',
                description: 'La suma global de todo lo que debes actualmente en tus tarjetas institucionales.',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: '#tour-msi',
            popover: {
                title: 'Deuda MSI Activa',
                description: 'Todo el dinero que ya tienes comprometido a futuro a Meses Sin Intereses.',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: '#tour-savings',
            popover: {
                title: 'Total Ahorrado',
                description: 'La suma de tus ahorros protegidos. Aquí puedes ver crecer tu patrimonio.',
                side: "bottom",
                align: 'start'
            }
        }
    ],
    
    accounts: [
        {
            popover: {
                title: 'Tus Tarjetas y Cuentas',
                description: 'Administra todas tus formas de pago: Débito, Efectivo y Tarjetas de Crédito.',
                align: 'center'
            }
        },
        {
            element: '#tour-acc-form',
            popover: {
                title: 'Agregar Nueva Cuenta',
                description: 'Registra tus tarjetas e indícales un color para diferenciarlas más rápido.',
                side: "right",
                align: 'start'
            }
        },
        {
            element: '#tour-acc-list',
            popover: {
                title: 'Detalle de Cuentas',
                description: 'En el caso de tus Tarjetas de Crédito, aquí podrás ver las compras a plazo (MSI) que tienes activas con su progreso mes a mes.',
                side: "top",
                align: 'start'
            }
        }
    ],

    addTransaction: [
        {
            popover: {
                title: 'Registrar Movimiento',
                description: 'Esta es la pantalla más importante. Aquí registras tus ingresos y tus compras diarias.',
                align: 'center'
            }
        },
        {
            element: '#tour-add-type',
            popover: {
                title: 'Tipo y Cuenta',
                description: 'Asegúrate de seleccionar bien si es Ingreso o Gasto, y con qué cuenta o tarjeta lo realizas.',
                side: "right",
                align: 'start'
            }
        },
        {
            element: '#tour-add-amount',
            popover: {
                title: 'Cantidad y Fecha',
                description: 'Registra el monto total. Si olvidaste registrar un gasto ayer, puedes cambiar la fecha aquí mismo para pasarlo al mes indicado.',
                side: "right",
                align: 'start'
            }
        },
        {
            element: '#tour-add-cat',
            popover: {
                title: 'Categorías Flexibles',
                description: 'Si ninguna de las categorías te sirve, usa el botón con el icono de "Etiqueta" para crear la tuya propia (ej. "Mascotas").',
                side: "right",
                align: 'start'
            }
        },
        {
            element: '#tour-add-msi',
            popover: {
                title: '¡Magia de los Meses Sin Intereses!',
                description: 'Si tu gasto es con Tarjeta de Crédito, puedes marcar la casilla "MSI" y dividir la compra en plazos (ej. 12 MSI). La app tomará esto como una deuda a futuro limitando temporalmente el saldo.',
                side: "top",
                align: 'start'
            }
        }
    ],

    fixedExpenses: [
        {
            popover: {
                title: 'Tus Gastos Fijos',
                description: 'Configura tus obligaciones de cada mes: Renta, Agua, Luz, Internet, Mantenimiento...',
                align: 'center'
            }
        },
        {
            element: '#tour-fixed-form',
            popover: {
                title: 'Agrega un Fijo',
                description: 'Ponle el monto referencial que te suele llegar cada mes. El sistema tomará en cuenta este gasto mes a mes en "A pagar este mes".',
                side: "right",
                align: 'start'
            }
        },
        {
            element: '#tour-fixed-list',
            popover: {
                title: 'Pago o Abono de Servicios',
                description: 'Haciendo clic, puedes indicarle al sistema desde qué cuenta pagaste la luz. Automáticamente lo marcará como "Pagado" y si abonaste un poco menos, lo dividirá (Abono múltiple).',
                side: "top",
                align: 'start'
            }
        }
    ],

    savings: [
        {
            popover: {
                title: 'Ahorros y Metas',
                description: 'Protege tu futuro financiero dándole un propósito a tu dinero guardado.',
                align: 'center'
            }
        },
        {
            element: '#tour-sav-form',
            popover: {
                title: 'Crear Ahorro/Fondo',
                description: 'Dale un nombre, un monto objetivo y una fecha límite.',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: '#tour-sav-free',
            popover: {
                title: 'O... Ahorro Libre',
                description: 'Si no tienes un monto límite o fecha específica al infinito, activa la casilla de Ahorro Libre para guardar sin presiones.',
                side: "bottom",
                align: 'center'
            }
        },
        {
            element: '#tour-sav-list',
            popover: {
                title: 'Abonar a Metas',
                description: 'Cuando quieras transferir tu dinero de débito hacia el ahorro, haz clic en "Abonar". El sistema sugerirá cuánto aportar periódicamente para lograr el objetivo a tiempo.',
                side: "top",
                align: 'start'
            }
        }
    ],

    msiDebt: [
        {
            popover: {
                title: 'Proyección de Deuda Futura',
                description: 'Visualiza en una gráfica cómo irán terminando tus compromisos o deudas a la fecha de hoy si dejas de adquirir más problemas de meses sin intereses.',
                align: 'center'
            }
        },
        {
            element: '#tour-msi-table',
            popover: {
                title: 'Mis Compras Vigentes',
                description: 'Una tabla maestra donde verás desglozados los plazos (3, 6, 12) y tu control manual de abonos.',
                side: "top",
                align: 'start'
            }
        },
        {
            element: '#tour-msi-pay',
            popover: {
                title: 'Indicando el Pago Mensual',
                description: 'A pesar de que liquidas la tarjeta en global desde la vista principal abonándole a la TDC, aquí puedes "marcar como pagado individualmente" un folio si así deseas un control microscópico.',
                side: "left",
                align: 'center'
            }
        }
    ],

    history: [
        {
            popover: {
                title: 'Últimos Movimientos',
                description: 'Verás todos las altas, ingresos o transferencias listados de aquí al infinito.',
                align: 'center'
            }
        },
        {
            element: '#tour-hist-table',
            popover: {
                title: 'Borrar un registro',
                description: 'Si te equivocaste al registrar algo, simplemente presiona el botón del basurero rojo aquí y el dinero será retornado a la cuenta de origen mágica y automáticamente.',
                side: "top",
                align: 'start'
            }
        }
    ]
};

// Exportar controlador principal
export const startTour = (pageId) => {
    if (!tours[pageId]) {
        console.warn(`No tour configured for: ${pageId}`);
        return;
    }

    const driverObj = driver({
        ...baseConfig,
        steps: tours[pageId]
    });

    // Pequeño retardo para asegurar que los elementos referenciados carguen o reentren (ej. un modal abierto)
    setTimeout(() => {
        driverObj.drive();
    }, 200);
};
