import { pgTable, foreignKey, unique, uuid, text, numeric, timestamp, serial, index, jsonb, date, check, boolean, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	email: text(),
	username: text().default('Invest_ZY_User'),
	riskLevel: text("risk_level").default('C3-稳健型'),
	balance: numeric({ precision: 20, scale:  2 }).default('1000000.00'),
	totalEquity: numeric("total_equity", { precision: 20, scale:  2 }).default('1000000.00'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	adminLevel: text("admin_level"),
	status: text(),
	totpSecret: text("totp_secret"),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "profiles_id_fkey"
		}).onDelete("cascade"),
	unique("profiles_email_key").on(table.email),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const holdings = pgTable("holdings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	symbol: text().notNull(),
	name: text().notNull(),
	quantity: numeric({ precision: 20, scale:  4 }).default('0'),
	availableQuantity: numeric("available_quantity", { precision: 20, scale:  4 }).default('0'),
	averagePrice: numeric("average_price", { precision: 20, scale:  4 }).default('0'),
	category: text().default('STOCK'),
	logoUrl: text("logo_url"),
	lastPrice: numeric("last_price", { precision: 20, scale:  4 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "holdings_user_id_fkey"
		}).onDelete("cascade"),
	unique("holdings_user_id_symbol_key").on(table.userId, table.symbol),
]);

export const transactions = pgTable("transactions", {
	id: text().primaryKey().notNull(),
	userId: uuid("user_id"),
	symbol: text().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	price: numeric({ precision: 20, scale:  4 }).notNull(),
	quantity: numeric({ precision: 20, scale:  4 }).notNull(),
	amount: numeric({ precision: 20, scale:  2 }).notNull(),
	status: text().default('SUCCESS'),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "transactions_user_id_fkey"
		}).onDelete("cascade"),
]);

export const transactionIdempotency = pgTable("transaction_idempotency", {
	transactionId: text("transaction_id").primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	response: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_transaction_expires").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transaction_idempotency_user_id_fkey"
		}),
]);

export const conditionalOrders = pgTable("conditional_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	symbol: text().notNull(),
	name: text().notNull(),
	orderType: text("order_type").notNull(),
	status: text().default('RUNNING'),
	config: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "conditional_orders_user_id_fkey"
		}).onDelete("cascade"),
]);

export const assetSnapshots = pgTable("asset_snapshots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	equity: numeric({ precision: 20, scale:  2 }).notNull(),
	balance: numeric({ precision: 20, scale:  2 }).notNull(),
	dailyProfit: numeric("daily_profit", { precision: 20, scale:  2 }).notNull(),
	snapshotDate: date("snapshot_date").default(sql`CURRENT_DATE`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "asset_snapshots_user_id_fkey"
		}).onDelete("cascade"),
	unique("asset_snapshots_user_id_snapshot_date_key").on(table.userId, table.snapshotDate),
]);

export const adminOperationLogs = pgTable("admin_operation_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	adminId: uuid("admin_id").notNull(),
	operationType: text("operation_type").notNull(),
	targetType: text("target_type"),
	targetId: text("target_id"),
	details: jsonb(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admin_logs_admin").using("btree", table.adminId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [users.id],
			name: "admin_operation_logs_admin_id_fkey"
		}).onDelete("set null"),
]);

export const trades = pgTable("trades", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	symbol: text().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	price: numeric({ precision: 20, scale:  4 }).notNull(),
	quantity: numeric({ precision: 20, scale:  4 }).notNull(),
	amount: numeric({ precision: 20, scale:  2 }).notNull(),
	status: text().default('PENDING'),
	fee: numeric({ precision: 18, scale:  2 }).default('0'),
	filledQuantity: numeric("filled_quantity", { precision: 20, scale:  4 }).default('0'),
	filledAmount: numeric("filled_amount", { precision: 18, scale:  2 }).default('0'),
	orderType: text("order_type").default('LIMIT'),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "trades_user_id_fkey"
		}).onDelete("cascade"),
	check("trades_order_type_check", sql`order_type = ANY (ARRAY['MARKET'::text, 'LIMIT'::text])`),
	check("trades_status_check", sql`status = ANY (ARRAY['PENDING'::text, 'FILLED'::text, 'CANCELLED'::text, 'FAILED'::text])`),
	check("trades_type_check", sql`type = ANY (ARRAY['BUY'::text, 'SELL'::text])`),
]);

export const assets = pgTable("assets", {
	userId: uuid("user_id").notNull(),
	availableBalance: numeric("available_balance", { precision: 18, scale:  2 }).default('1000000.00'),
	frozenBalance: numeric("frozen_balance", { precision: 18, scale:  2 }).default('0.00'),
	totalAsset: numeric("total_asset", { precision: 18, scale:  2 }).default('1000000.00'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "assets_user_id_fkey"
		}).onDelete("cascade"),
	unique("assets_user_id_key").on(table.userId),
]);

export const positions = pgTable("positions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	symbol: text().notNull(),
	name: text().notNull(),
	quantity: numeric({ precision: 20, scale:  4 }).default('0'),
	availableQuantity: numeric("available_quantity", { precision: 20, scale:  4 }).default('0'),
	averagePrice: numeric("average_price", { precision: 20, scale:  4 }).default('0'),
	currentPrice: numeric("current_price", { precision: 20, scale:  4 }).default('0'),
	marketValue: numeric("market_value", { precision: 20, scale:  2 }).default('0'),
	profitLoss: numeric("profit_loss", { precision: 20, scale:  4 }).default('0'),
	profitLossPercent: numeric("profit_loss_percent", { precision: 20, scale:  2 }).default('0'),
	lockedQuantity: numeric("locked_quantity", { precision: 20, scale:  4 }).default('0'),
	lockUntil: date("lock_until"),
	riskLevel: text("risk_level").default('LOW'),
	isForcedSell: boolean("is_forced_sell").default(false),
	forcedSellAt: timestamp("forced_sell_at", { withTimezone: true, mode: 'string' }),
	forcedSellReason: text("forced_sell_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "positions_user_id_fkey"
		}).onDelete("cascade"),
	unique("positions_user_id_symbol_key").on(table.userId, table.symbol),
	check("positions_risk_level_check", sql`risk_level = ANY (ARRAY['HIGH'::text, 'MEDIUM'::text, 'LOW'::text])`),
]);

export const batchTradeOrders = pgTable("batch_trade_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	orderType: text("order_type").notNull(),
	totalCount: integer("total_count").default(0),
	successCount: integer("success_count").default(0),
	failedCount: integer("failed_count").default(0),
	status: text().default('PENDING'),
	details: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "batch_trade_orders_user_id_fkey"
		}).onDelete("cascade"),
	check("batch_trade_orders_order_type_check", sql`order_type = ANY (ARRAY['BATCH_BUY'::text, 'BATCH_SELL'::text])`),
	check("batch_trade_orders_status_check", sql`status = ANY (ARRAY['PENDING'::text, 'PROCESSING'::text, 'COMPLETED'::text, 'FAILED'::text])`),
]);

export const marketDataCache = pgTable("market_data_cache", {
	symbol: text().primaryKey().notNull(),
	data: jsonb().notNull(),
	cachedAt: timestamp("cached_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
});

export const reports = pgTable("reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	category: text().notNull(),
	summary: text(),
	sentiment: text(),
	author: text(),
	content: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("reports_sentiment_check", sql`sentiment = ANY (ARRAY['看多'::text, '中性'::text, '看空'::text])`),
]);

export const banners = pgTable("banners", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	imageUrl: text("image_url"),
	linkUrl: text("link_url"),
	position: integer().notNull(),
	isActive: boolean("is_active").default(true),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const userRecommendations = pgTable("user_recommendations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	symbol: text().notNull(),
	name: text().notNull(),
	reason: text(),
	recommendationType: text("recommendation_type"),
	score: numeric(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_recommendations_user_id_fkey"
		}).onDelete("cascade"),
]);

export const adminUsers = pgTable("admin_users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	adminLevel: text("admin_level").default('admin'),
	permissions: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "admin_users_user_id_fkey"
		}).onDelete("cascade"),
	check("admin_users_admin_level_check", sql`admin_level = ANY (ARRAY['super_admin'::text, 'admin'::text, 'user'::text])`),
]);

export const calendarEvents = pgTable("calendar_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	eventDate: date("event_date").notNull(),
	eventType: text("event_type"),
	description: text(),
	importance: text().default('普通'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	time: text(),
});

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ticketId: text("ticket_id").notNull(),
	senderId: text("sender_id").notNull(),
	senderType: text("sender_type").notNull(),
	content: text().notNull(),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_messages_created").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_messages_sender_type_is_read").using("btree", table.senderType.asc().nullsLast().op("text_ops"), table.isRead.asc().nullsLast().op("bool_ops")),
	index("idx_messages_ticket").using("btree", table.ticketId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [supportTickets.id],
			name: "messages_ticket_id_fkey"
		}).onDelete("cascade"),
	check("messages_sender_type_check", sql`sender_type = ANY (ARRAY['user'::text, 'admin'::text, 'system'::text])`),
]);

export const userNotifications = pgTable("user_notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	notificationType: text("notification_type").notNull(),
	title: text().notNull(),
	content: text().notNull(),
	relatedType: text("related_type"),
	relatedId: text("related_id"),
	isRead: boolean("is_read").default(false),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	priority: text().default('NORMAL'),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_notifications_priority").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("idx_notifications_type").using("btree", table.notificationType.asc().nullsLast().op("text_ops")),
	index("idx_notifications_unread").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.isRead.asc().nullsLast().op("bool_ops")).where(sql`(is_read = false)`),
	index("idx_notifications_user").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_notifications_user_id_fkey"
		}).onDelete("cascade"),
	check("user_notifications_notification_type_check", sql`notification_type = ANY (ARRAY['SYSTEM'::text, 'TRADE'::text, 'FORCE_SELL'::text, 'APPROVAL'::text, 'RISK_WARNING'::text, 'ACCOUNT'::text, 'ANNOUNCEMENT'::text])`),
	check("user_notifications_priority_check", sql`priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text])`),
]);

export const supportTickets = pgTable("support_tickets", {
	id: text().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	subject: text().notNull(),
	description: text(),
	status: text().default('OPEN'),
	priority: text().default('NORMAL'),
	lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	unreadCountUser: integer("unread_count_user").default(0),
	unreadCountAdmin: integer("unread_count_admin").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	guestId: text("guest_id"),
	guestName: text("guest_name"),
	guestPhone: text("guest_phone"),
	queueStatus: text("queue_status").default('WAITING'),
	assignedAdminId: text("assigned_admin_id"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_support_tickets_assigned").using("btree", table.assignedAdminId.asc().nullsLast().op("text_ops"), table.queueStatus.asc().nullsLast().op("text_ops")),
	index("idx_support_tickets_queue").using("btree", table.queueStatus.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "support_tickets_user_id_fkey"
		}).onDelete("cascade"),
	check("support_tickets_priority_check", sql`priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text])`),
	check("support_tickets_queue_status_check", sql`queue_status = ANY (ARRAY['WAITING'::text, 'PROCESSING'::text, 'COMPLETED'::text])`),
	check("support_tickets_status_check", sql`status = ANY (ARRAY['OPEN'::text, 'IN_PROGRESS'::text, 'RESOLVED'::text, 'CLOSED'::text])`),
]);

export const forceSellRecords = pgTable("force_sell_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	positionId: uuid("position_id"),
	userId: uuid("user_id").notNull(),
	adminId: uuid("admin_id").notNull(),
	symbol: text().notNull(),
	stockName: text("stock_name"),
	quantity: numeric({ precision: 20, scale:  4 }).notNull(),
	price: numeric({ precision: 20, scale:  4 }),
	amount: numeric({ precision: 20, scale:  2 }),
	reason: text().notNull(),
	status: text().default('COMPLETED'),
	tradeId: uuid("trade_id"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_force_sell_admin").using("btree", table.adminId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_force_sell_symbol").using("btree", table.symbol.asc().nullsLast().op("text_ops")),
	index("idx_force_sell_user").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [users.id],
			name: "force_sell_records_admin_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.positionId],
			foreignColumns: [positions.id],
			name: "force_sell_records_position_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "force_sell_records_trade_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "force_sell_records_user_id_fkey"
		}).onDelete("cascade"),
	check("force_sell_records_status_check", sql`status = ANY (ARRAY['PENDING'::text, 'COMPLETED'::text, 'FAILED'::text])`),
]);

export const fundFlows = pgTable("fund_flows", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	flowType: text("flow_type").notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	balanceAfter: numeric("balance_after", { precision: 18, scale:  2 }).notNull(),
	relatedTradeId: uuid("related_trade_id"),
	remark: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_fund_flows_type").using("btree", table.flowType.asc().nullsLast().op("text_ops")),
	index("idx_fund_flows_user").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fund_flows_user_id_fkey"
		}).onDelete("cascade"),
	check("fund_flows_flow_type_check", sql`flow_type = ANY (ARRAY['DEPOSIT'::text, 'WITHDRAW'::text, 'TRADE_BUY'::text, 'TRADE_SELL'::text, 'FEE'::text, 'FREEZE'::text, 'UNFREEZE'::text, 'REFUND'::text])`),
]);

export const settlementLogs = pgTable("settlement_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	settlementDate: date("settlement_date").notNull(),
	totalUsers: integer("total_users").default(0),
	totalTrades: integer("total_trades").default(0),
	totalVolume: numeric("total_volume", { precision: 18, scale:  2 }).default('0'),
	unlockedPositions: integer("unlocked_positions").default(0),
	status: text().default('RUNNING'),
	errorMessage: text("error_message"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_settlement_date").using("btree", table.settlementDate.desc().nullsFirst().op("date_ops")),
	unique("settlement_logs_settlement_date_key").on(table.settlementDate),
	check("settlement_logs_status_check", sql`status = ANY (ARRAY['RUNNING'::text, 'SUCCESS'::text, 'FAILED'::text])`),
]);

export const blockTradeProducts = pgTable("block_trade_products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	symbol: text().notNull(),
	name: text().notNull(),
	productType: text("product_type").notNull(),
	market: text().notNull(),
	currentPrice: numeric("current_price").notNull(),
	change: numeric().default('0'),
	changePercent: numeric("change_percent").default('0'),
	volume: numeric().default('0'),
	minBlockSize: integer("min_block_size").notNull(),
	blockDiscount: numeric("block_discount").default('0.95'),
	status: text().default('ACTIVE'),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_block_products_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_block_products_symbol").using("btree", table.symbol.asc().nullsLast().op("text_ops")),
	unique("block_trade_products_symbol_key").on(table.symbol),
	check("block_trade_products_block_discount_check", sql`(block_discount > (0)::numeric) AND (block_discount <= (1)::numeric)`),
	check("block_trade_products_product_type_check", sql`product_type = ANY (ARRAY['COMMODITY'::text, 'STOCK'::text, 'INDEX'::text])`),
	check("block_trade_products_status_check", sql`status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])`),
]);

export const limitUpStocks = pgTable("limit_up_stocks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	symbol: text().notNull(),
	name: text().notNull(),
	market: text().notNull(),
	stockType: text("stock_type").default('NORMAL'),
	preClose: numeric("pre_close").notNull(),
	currentPrice: numeric("current_price").notNull(),
	limitUpPrice: numeric("limit_up_price").notNull(),
	limitDownPrice: numeric("limit_down_price").notNull(),
	change: numeric().default('0'),
	changePercent: numeric("change_percent").default('0'),
	volume: numeric().default('0'),
	turnover: numeric().default('0'),
	isLimitUp: boolean("is_limit_up").default(false),
	status: text().default('ACTIVE'),
	tradeDate: date("trade_date").default(sql`CURRENT_DATE`),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_limit_up_date").using("btree", table.tradeDate.desc().nullsFirst().op("date_ops")),
	index("idx_limit_up_status").using("btree", table.isLimitUp.asc().nullsLast().op("bool_ops"), table.status.asc().nullsLast().op("bool_ops")),
	index("idx_limit_up_symbol").using("btree", table.symbol.asc().nullsLast().op("text_ops")),
	unique("limit_up_stocks_symbol_trade_date_key").on(table.symbol, table.tradeDate),
	check("limit_up_stocks_market_check", sql`market = ANY (ARRAY['SH'::text, 'SZ'::text])`),
	check("limit_up_stocks_stock_type_check", sql`stock_type = ANY (ARRAY['NORMAL'::text, 'ST'::text, 'GEM'::text])`),
]);

export const fundTransfers = pgTable("fund_transfers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fromAccount: text("from_account").notNull(),
	toAccount: text("to_account").notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	status: text().default('PENDING'),
	remark: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fund_transfers_user_id_fkey"
		}).onDelete("cascade"),
	check("fund_transfers_status_check", sql`status = ANY (ARRAY['PENDING'::text, 'SUCCESS'::text, 'FAILED'::text])`),
]);

export const faceVerificationLogs = pgTable("face_verification_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	verificationResult: text("verification_result"),
	confidence: numeric(),
	imageUrl: text("image_url"),
	ipAddress: text("ip_address"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "face_verification_logs_user_id_fkey"
		}).onDelete("cascade"),
]);

export const accountApplications = pgTable("account_applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	applicationType: text("application_type").notNull(),
	status: text().default('PENDING'),
	details: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "account_applications_user_id_fkey"
		}).onDelete("cascade"),
	check("account_applications_status_check", sql`status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])`),
]);

export const ipoSubscriptions = pgTable("ipo_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	ipoId: uuid("ipo_id"),
	symbol: text().notNull(),
	subscriptionQuantity: numeric("subscription_quantity").notNull(),
	status: text().default('PENDING'),
	allocatedQuantity: numeric("allocated_quantity").default('0'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.ipoId],
			foreignColumns: [ipos.id],
			name: "ipo_subscriptions_ipo_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ipo_subscriptions_user_id_fkey"
		}).onDelete("cascade"),
	check("ipo_subscriptions_status_check", sql`status = ANY (ARRAY['PENDING'::text, 'SUCCESS'::text, 'FAILED'::text, 'PARTIAL'::text])`),
]);

export const ipos = pgTable("ipos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	symbol: text().notNull(),
	name: text().notNull(),
	market: text().notNull(),
	status: text().notNull(),
	ipoPrice: numeric("ipo_price"),
	issueDate: date("issue_date"),
	listingDate: date("listing_date"),
	subscriptionCode: text("subscription_code"),
	issueVolume: numeric("issue_volume"),
	onlineIssueVolume: numeric("online_issue_volume"),
	peRatio: numeric("pe_ratio"),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_ipos_listing_date").using("btree", table.listingDate.asc().nullsLast().op("date_ops")),
	index("idx_ipos_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_ipos_symbol").using("btree", table.symbol.asc().nullsLast().op("text_ops")),
	check("ipos_market_check", sql`market = ANY (ARRAY['SH'::text, 'SZ'::text])`),
	check("ipos_status_check", sql`status = ANY (ARRAY['LISTED'::text, 'UPCOMING'::text, 'ONGOING'::text])`),
]);

export const educationContent = pgTable("education_content", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	topicId: uuid("topic_id"),
	title: text().notNull(),
	content: text(),
	videoUrl: text("video_url"),
	orderIndex: integer("order_index").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [educationTopics.id],
			name: "education_content_topic_id_fkey"
		}).onDelete("cascade"),
]);

export const tradeRules = pgTable("trade_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ruleName: text("rule_name").notNull(),
	ruleKey: text("rule_key").notNull(),
	ruleValue: jsonb("rule_value").notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("trade_rules_rule_key_key").on(table.ruleKey),
]);

export const educationTopics = pgTable("education_topics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	category: text().notNull(),
	description: text(),
	content: text(),
	difficulty: text().default('初级'),
	duration: integer(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	author: text().default('银河证券'),
	views: integer().default(0),
	likes: integer().default(0),
	status: text().default('PUBLISHED'),
	isPublished: boolean("is_published").default(false),
	image: text(),
	order: integer().default(0),
});

export const watchlist = pgTable("watchlist", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	symbol: text().notNull(),
	name: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_watchlist_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "watchlist_user_id_fkey"
		}).onDelete("cascade"),
	unique("watchlist_user_id_symbol_key").on(table.userId, table.symbol),
]);

export const ipoSyncHistory = pgTable("ipo_sync_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	syncTime: timestamp("sync_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	status: text().notNull(),
	totalCount: integer("total_count").default(0),
	newCount: integer("new_count").default(0),
	updatedCount: integer("updated_count").default(0),
	errorMessage: text("error_message"),
	triggeredBy: text("triggered_by").default('manual'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_ipo_sync_history_time").using("btree", table.syncTime.desc().nullsFirst().op("timestamptz_ops")),
	check("ipo_sync_history_status_check", sql`status = ANY (ARRAY['success'::text, 'failed'::text, 'partial'::text])`),
	check("ipo_sync_history_triggered_by_check", sql`triggered_by = ANY (ARRAY['manual'::text, 'scheduled'::text, 'auto'::text])`),
]);

export const phoneVerificationLogs = pgTable("phone_verification_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	valid: boolean().notNull(),
	phoneInfo: jsonb("phone_info"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 通知表 - 用于开户申请等系统通知
export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: text().notNull(),
	title: text().notNull(),
	content: text().notNull(),
	userId: uuid("user_id"),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_notifications_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_notifications_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

// 管理端任务表 - 用于开户审核等任务
export const adminTasks = pgTable("admin_tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: text().notNull(),
	title: text().notNull(),
	description: text(),
	userId: uuid("user_id"),
	status: text().default('PENDING'),
	priority: text().default('MEDIUM'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admin_tasks_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_admin_tasks_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_admin_tasks_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

// 交易热度表 - 用于热门股票展示
export const tradingHotness = pgTable("trading_hotness", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	symbol: text().notNull(),
	tradeCount: integer("trade_count").default(0),
	totalVolume: numeric("total_volume", { precision: 20, scale: 4 }).default('0'),
	uniqueTraders: integer("unique_traders").default(0),
	avgPrice: numeric("avg_price", { precision: 20, scale: 4 }).default('0'),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_trading_hotness_trade_count").using("btree", table.tradeCount.desc().nullsLast().op("int4_ops")),
	index("idx_trading_hotness_symbol").using("btree", table.symbol.asc().nullsLast().op("text_ops")),
]);
