import { getSearchTools } from "./search.tools";
import { getContactTools } from "./contact.tools";
import { getCompanyTools } from "./company.tools";
import { getInteractionTools } from "./interaction.tools";
import { getNoteTools } from "./note.tools";
import { getNotificationTools } from "./notification.tools";

export function getTools(userId: string): Record<string, any> {
	const searchTools = getSearchTools(userId);
	const contactTools = getContactTools(userId);
	const companyTools = getCompanyTools(userId);
	const interactionTools = getInteractionTools(userId);
	const noteTools = getNoteTools(userId);
	const notificationTools = getNotificationTools(userId);

	return Object.assign(
		{},
		searchTools,
		contactTools,
		companyTools,
		interactionTools,
		noteTools,
		notificationTools
	);
}

export {
	getSearchTools,
	getContactTools,
	getCompanyTools,
	getInteractionTools,
	getNoteTools,
	getNotificationTools,
};
