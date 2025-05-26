export const contactConfig = {
    phoneNumber: '+918016731058',
    email: 'contactiskcondeoghar@gmail.com',
    address: {
        street: 'ISKCON Deoghar',
        area: 'Daburgram',
        city: 'Beside Maihar Garden',
        state: 'Jharkhand',
        pincode: '814112',
        country: 'India',
        // Helper function to get formatted address
        getFormattedAddress: () => {
            const { street, area, city, state, pincode, country } = contactConfig.address;
            return `${street}\n${area}\n${city}\n${state}-${pincode}, ${country}`;
        }
    },
    whatsapp: {
        message: 'Hare Krishna, I would like to know more about ISKCON Deoghar temple.',
        // Remove '+' from phone number for WhatsApp API
        getWhatsAppLink: (message: string) => {
            const number = contactConfig.phoneNumber.replace('+', '');
            const encodedMessage = encodeURIComponent(message);
            return `https://wa.me/${number}?text=${encodedMessage}`;
        }
    },
    social: {
        facebook: 'https://www.facebook.com/iskcondeogharofficial/',
        youtube: 'https://www.youtube.com/@iskcondeogharofficial'
    }
}; 