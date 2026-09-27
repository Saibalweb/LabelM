declare module 'easy-yopmail' {
  interface YopmailInboxMessage {
    id: string
    subject?: string
    from?: string
    date?: string
  }
  interface YopmailInbox {
    totalEmails: number
    inbox: YopmailInboxMessage[]
  }
  interface YopmailMessage {
    id: string
    submit?: string
    from?: string
    date?: string
    content?: string
  }
  const easyYopmail: {
    getInbox(
      login: string,
      search?: Record<string, unknown>,
      settings?: Record<string, unknown>
    ): Promise<YopmailInbox>
    readMessage(
      login: string,
      id: string,
      settings?: Record<string, unknown>
    ): Promise<YopmailMessage>
  }
  export default easyYopmail
}
