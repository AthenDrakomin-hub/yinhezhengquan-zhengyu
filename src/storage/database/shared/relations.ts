import { relations } from "drizzle-orm/relations";
import { usersInAuth, profiles, holdings, transactions, transactionIdempotency, conditionalOrders, assetSnapshots, adminOperationLogs, trades, assets, positions, batchTradeOrders, userRecommendations, adminUsers, supportTickets, messages, userNotifications, forceSellRecords, fundFlows, fundTransfers, faceVerificationLogs, accountApplications, ipos, ipoSubscriptions, educationTopics, educationContent, watchlist } from "./schema";

export const profilesRelations = relations(profiles, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [profiles.id],
		references: [usersInAuth.id]
	}),
	holdings: many(holdings),
	transactions: many(transactions),
	conditionalOrders: many(conditionalOrders),
	assetSnapshots: many(assetSnapshots),
	watchlists: many(watchlist),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	profiles: many(profiles),
	transactionIdempotencies: many(transactionIdempotency),
	adminOperationLogs: many(adminOperationLogs),
	trades: many(trades),
	assets: many(assets),
	positions: many(positions),
	batchTradeOrders: many(batchTradeOrders),
	userRecommendations: many(userRecommendations),
	adminUsers: many(adminUsers),
	userNotifications: many(userNotifications),
	supportTickets: many(supportTickets),
	forceSellRecords_adminId: many(forceSellRecords, {
		relationName: "forceSellRecords_adminId_usersInAuth_id"
	}),
	forceSellRecords_userId: many(forceSellRecords, {
		relationName: "forceSellRecords_userId_usersInAuth_id"
	}),
	fundFlows: many(fundFlows),
	fundTransfers: many(fundTransfers),
	faceVerificationLogs: many(faceVerificationLogs),
	accountApplications: many(accountApplications),
	ipoSubscriptions: many(ipoSubscriptions),
}));

export const holdingsRelations = relations(holdings, ({one}) => ({
	profile: one(profiles, {
		fields: [holdings.userId],
		references: [profiles.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	profile: one(profiles, {
		fields: [transactions.userId],
		references: [profiles.id]
	}),
}));

export const transactionIdempotencyRelations = relations(transactionIdempotency, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [transactionIdempotency.userId],
		references: [usersInAuth.id]
	}),
}));

export const conditionalOrdersRelations = relations(conditionalOrders, ({one}) => ({
	profile: one(profiles, {
		fields: [conditionalOrders.userId],
		references: [profiles.id]
	}),
}));

export const assetSnapshotsRelations = relations(assetSnapshots, ({one}) => ({
	profile: one(profiles, {
		fields: [assetSnapshots.userId],
		references: [profiles.id]
	}),
}));

export const adminOperationLogsRelations = relations(adminOperationLogs, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [adminOperationLogs.adminId],
		references: [usersInAuth.id]
	}),
}));

export const tradesRelations = relations(trades, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [trades.userId],
		references: [usersInAuth.id]
	}),
	forceSellRecords: many(forceSellRecords),
}));

export const assetsRelations = relations(assets, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [assets.userId],
		references: [usersInAuth.id]
	}),
}));

export const positionsRelations = relations(positions, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [positions.userId],
		references: [usersInAuth.id]
	}),
	forceSellRecords: many(forceSellRecords),
}));

export const batchTradeOrdersRelations = relations(batchTradeOrders, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [batchTradeOrders.userId],
		references: [usersInAuth.id]
	}),
}));

export const userRecommendationsRelations = relations(userRecommendations, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userRecommendations.userId],
		references: [usersInAuth.id]
	}),
}));

export const adminUsersRelations = relations(adminUsers, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [adminUsers.userId],
		references: [usersInAuth.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	supportTicket: one(supportTickets, {
		fields: [messages.ticketId],
		references: [supportTickets.id]
	}),
}));

export const supportTicketsRelations = relations(supportTickets, ({one, many}) => ({
	messages: many(messages),
	usersInAuth: one(usersInAuth, {
		fields: [supportTickets.userId],
		references: [usersInAuth.id]
	}),
}));

export const userNotificationsRelations = relations(userNotifications, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userNotifications.userId],
		references: [usersInAuth.id]
	}),
}));

export const forceSellRecordsRelations = relations(forceSellRecords, ({one}) => ({
	usersInAuth_adminId: one(usersInAuth, {
		fields: [forceSellRecords.adminId],
		references: [usersInAuth.id],
		relationName: "forceSellRecords_adminId_usersInAuth_id"
	}),
	position: one(positions, {
		fields: [forceSellRecords.positionId],
		references: [positions.id]
	}),
	trade: one(trades, {
		fields: [forceSellRecords.tradeId],
		references: [trades.id]
	}),
	usersInAuth_userId: one(usersInAuth, {
		fields: [forceSellRecords.userId],
		references: [usersInAuth.id],
		relationName: "forceSellRecords_userId_usersInAuth_id"
	}),
}));

export const fundFlowsRelations = relations(fundFlows, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [fundFlows.userId],
		references: [usersInAuth.id]
	}),
}));

export const fundTransfersRelations = relations(fundTransfers, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [fundTransfers.userId],
		references: [usersInAuth.id]
	}),
}));

export const faceVerificationLogsRelations = relations(faceVerificationLogs, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [faceVerificationLogs.userId],
		references: [usersInAuth.id]
	}),
}));

export const accountApplicationsRelations = relations(accountApplications, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [accountApplications.userId],
		references: [usersInAuth.id]
	}),
}));

export const ipoSubscriptionsRelations = relations(ipoSubscriptions, ({one}) => ({
	ipo: one(ipos, {
		fields: [ipoSubscriptions.ipoId],
		references: [ipos.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [ipoSubscriptions.userId],
		references: [usersInAuth.id]
	}),
}));

export const iposRelations = relations(ipos, ({many}) => ({
	ipoSubscriptions: many(ipoSubscriptions),
}));

export const educationContentRelations = relations(educationContent, ({one}) => ({
	educationTopic: one(educationTopics, {
		fields: [educationContent.topicId],
		references: [educationTopics.id]
	}),
}));

export const educationTopicsRelations = relations(educationTopics, ({many}) => ({
	educationContents: many(educationContent),
}));

export const watchlistRelations = relations(watchlist, ({one}) => ({
	profile: one(profiles, {
		fields: [watchlist.userId],
		references: [profiles.id]
	}),
}));